'use strict';

const os = require('os');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const Promise = require('bluebird');
const ProxyAgent = require('proxy-agent');
const tar = require('tar-stream');
const bz2 = require('unbzip2-stream');
const unzip = require('node-unzip-2');

/**
 * Version of the GitHub API to use.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const GITHUB_API_VERSION = "v3";

/**
 * User-Agent to send to the GitHub API.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const USER_AGENT = "get-aria2c";

/**
 * Regex to match the aria2c binary.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const PATH_REGEX = /\/bin\/aria2c|\/aria2c\.exe|\/aria2c$/;

/**
 * Regex to match the asset name from GitHub.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const ASSET_NAME_REGEX = /((?:\d+\.)?(?:\d+\.)?(?:\*|\d+))-.?(android|osx-darwin|win|linux-gnu)+?(?:-(arm|64bit|32bit))?/;

/**
 * Regex to match supproted archives.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const SUPPORTED_ARCHIVES_REGEX = /\.zip|\.tar\.gz|\.tgz|\.tar\.bz2|\.tar/;

let proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || process.env.PROXY_URL;
let agent =  proxyUrl ? new ProxyAgent(proxyUrl) : void(0);

let requestOptions = {
    agent,
    headers: {
        'Accept': `application/vnd.github.${GITHUB_API_VERSION}+json`,
        'User-Agent': USER_AGENT
    }
};

const request = require('request-promise').defaults(requestOptions);
const streamingRequest = require('request').defaults(requestOptions);

/**
 * The offical aria2 repo. Used for Mac and Windows releases.
 * @constant
 * @default
 * @type {string}
 * @private
 */
const ARIA2_REPO = 'aria2/aria2';
/**
 * The repo used for Linux releases.
 * @constant 
 * @default
 * @type {string}
 * @private
 */
const LINUX_BUILD_REPO = 'q3aql/aria2-static-builds';

/**
 * Valid platforms which can be used with this application.
 * @constant
 * @default
 * @type {string[]}
 * @private
 */
const valid_platforms = Object.freeze([
    "win32",
    "darwin",
    "linux",
    "android"
]);

/**
 * Valid platform/arch pairings which can be used with this application.
 * @constant
 * @default
 * @type {Object}
 * @private
 */
const valid_arch_platform_pairs = Object.freeze({
    "win32": ["x32", "x64"],   
    "linux": ["x32", "x64", "arm"],   
    "android": ["arm"],   
    "darwin": ["x64"]
});

/**
 * Mappings between the names of the platforms used on GitHub and the names used by the application.
 * @constant
 * @default
 * @type {Object}
 * @private
 */
const platform_mappings = Object.freeze({
    "win": "win32",
    "linux-gnu": "linux",
    "osx-darwin": "darwin",
    "android": "android"
});

/**
 * Mappings between the architecture of the platforms used on GitHub and the names used by the application.
 * @constant
 * @default
 * @type {Object}
 * @private
 */
const arch_mappings = Object.freeze({
    "32bit": "x32",
    "64bit": "x64",
    "arm": "arm"
});

/**
 * Information on an asset in a release.
 * @typedef AssetInfo
 * @property {string} version - Platform of the build.
 * @property {string} platform - Architecture of the build.
 * @property {string} arch - Version of the build.
 * @private
 */

/**
 * Gets information on a particular asset of a release.
 * 
 * @param {string} assetName - Name of the asset from GitHub.
 * @returns {AssetInfo} - Information on the asset.
 * @private
 */
function getAssetInfo(assetName) {
    let match = assetName.match(ASSET_NAME_REGEX);
    if (!match) 
        return null;

    let version = match[1];
    let platform = platform_mappings[match[2]];
    let arch = (platform === 'darwin') ? 'x64' : arch_mappings[match[3]];

    return { version, platform, arch };
}

/**
 * Returns the path to the aria2c binary that is automatically installed with this package.
 * @returns {string} - The aria2c path.
 */
function aria2cPath() {
    let pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), 'utf8'));
    return path.join.apply(null, [__dirname, ".."].concat(pkg.bin.aria2c.split('/')));
}

/**
 * This function returns a stream containing the aria2 binary for the provided platform and arch.
 * @param {string} [platform=os.platform()] - The platform to download the binary for. See {@link https://bit.ly/2QE0hbF|the node documentation} for a list of platforms.
 * @param {string} [arch=os.arch()] - The architecture to download the binary for. "x32" and "x64" are valid for Windows and Linux. "arm" is valid for Android and Linux. Only "x64" is valid for Mac.
 * @returns {Promise<Stream>}
 * @async
 */
async function getAria2(platform, arch) {
    platform = platform || os.platform();
    arch = arch || os.arch();

    // Check platform and arch.
    if (!valid_platforms.includes(platform))
        throw new Error(`Unsupported platform "${platform}"`);

    if (!valid_arch_platform_pairs[platform].includes(arch))
        throw new Error(`Architecture "${arch}" is not supported on "${platform}"`);

    let repository = platform === 'linux' ? LINUX_BUILD_REPO : ARIA2_REPO;
    // Get the URL to the zip file 
    let releases = await request({
        url: `https://api.github.com/repos/${repository}/releases`,
        transform: JSON.parse
    });

    // Get the URL of the release needed
    let url;
    let version;
    for (let release of releases) {
        for (let asset of release.assets) {
            let assetInfo = getAssetInfo(asset.name);
            if (assetInfo && assetInfo.platform === platform && assetInfo.arch === arch) {
                if (asset.browser_download_url.indexOf('.dmg') !== -1) continue;
                version = assetInfo.version;
                url = asset.browser_download_url;
                break;
            }
        }
        if (url) break;
    }

    let extMatch = url.match(SUPPORTED_ARCHIVES_REGEX);
    if (!extMatch) throw new Error(`The URL "${url}" was not formmated properly. Could not determine archive type.`);
    let ext = extMatch[0];

    return new Promise((resolve, reject) => {
        
        let archiveStream = () => {
            return streamingRequest({
                url,
                encoding: false
            });
        };

        if (ext.indexOf('tar') !== -1) {
            let tarStream = archiveStream();
            if (ext === '.tar.bz2') {
                tarStream = tarStream.pipe(bz2());
            } else if ('.tar.gz') {
                tarStream = tarStream.pipe(zlib.createGunzip());
            } else {
                return reject(new Error(`Invalid archive file type "${ext}"`));
            }

            let extract = tar.extract();
            extract.on('entry', (header, entry, next) => {
                entry.on('end', () => {
                    next();
                });

                if (header.name.match(PATH_REGEX)) {
                    resolve({ binaryStream: entry, version });
                } else {
                    entry.resume();
                }
            });

            extract.on('finish', () => {
            });

            extract.once('error', (error) => {
                reject(error);
            });

            tarStream.pipe(extract);
        } else if (ext.indexOf('zip') !== -1) {
            let zipStream = unzip.Parse();

            zipStream.on('entry', (entry) => {
                if (entry.path.match(PATH_REGEX)) {
                    resolve({ binaryStream: entry, version });
                } else {
                    entry.autodrain();
                }
            });

            zipStream.once('error', (error) => {
                reject(error);
            });

            archiveStream().pipe(zipStream);
        } else {
            reject(new Error(`Invalid archive file type "${ext}"`));
        }
    });
};

/**
 * This module contains a {@link getAria2|function} which will return the latest version of aria2 as a stream.
 * It will also return a {@link aria2cPath|function} which will return the path to aria2 automatically downloaded with this package.
 * 
 * @module get-aria2
 */
module.exports = { getAria2, aria2cPath };