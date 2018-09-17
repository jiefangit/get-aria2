const fs = require('fs');
const { platform, arch } = require('os');
const { spawn } = require('child_process');
const Promise = require('bluebird');
const { assert } = require('chai');
const { getAria2 } = require('../');
const path = require('path');
const chmod = require('chmod');
const del = require('del');
Promise.promisifyAll(fs);

describe('getAria2(platform, arch)', function () {
    it('should download the aria2 binary and run it without a problem', async function () {
        this.timeout(30000);
        let { binaryStream, version } = await getAria2(platform(), arch());

        assert.ok(version, "Did not return a version");
        assert.ok(binaryStream, "Did not return a binary");
    
        let workDir = fs.mkdtempSync('get-aria2-tests');
        let execPath = path.join(workDir, "aria2c");
        let outStream = fs.createWriteStream(execPath);
        binaryStream.pipe(outStream);
        await new Promise((resolve, reject) => {
            outStream.once('finish', () => {
                chmod(execPath, 777);
                resolve();
            });
    
            outStream.once('error', (error) => {
                reject(error);
            });
        });
        
        await new Promise((resolve, reject) => {
            let aria2 = spawn(execPath, ['--version'], {
                stdio: ['ignore', 'pipe', 'pipe'], 
            });
    
            aria2.stdout.on('data', (buf) => {
                try {
                    let version = buf.toString();
    
                    assert.equal(version.substr(0, 5), 'aria2', "Did not output the aria2 version");
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    aria2.kill('SIGINT');
                }
            });
    
            aria2.stderr.once('data', (buf) => {
                reject(new Error(buf.toString()));
                aria2.kill('SIGINT');
            });
        });

        await del(path.join(workDir, "**"), { force: true });
    });
});