# get-aria2

[![NPM](https://nodei.co/npm/get-aria2.png)](https://nodei.co/npm/get-aria2/)

[![Build Status](https://travis-ci.org/znetstar/get-aria2.svg?branch=master)](https://travis-ci.org/znetstar/get-aria2) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fznetstar%2Fget-aria2.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fznetstar%2Fget-aria2?ref=badge_shield)


This package contains a tool that will download the latest version of aria2 from GitHub.

## NPM

If the package is added as a dependency in another node module (`npm install get-aria2`) it will write the `aria2c` binary to `node_modules/.bin`. If installed globally (`npm install -g get-aria2`) the binary will be added to your PATH so you can use `aria2c` on the command line.

To use with a proxy set the "PROXY_URL" environment variable. Example: `PROXY_URL=http://blah-blah:2323`. Can accept anything [proxy-agent](https://bit.ly/2Qz8vSj) can.

All platforms but linux are downloaded from "aria2/aria2".
Linux is downloaded from "q3aql/aria2-static-builds".

## Command-Line

This package also contains a tool for downloading aria2 on different platforms. 

The syntax is: `get-aria2 [destination] [arguments]`

| Argument   | Alias | Description                                                                                       |
|------------|-------|---------------------------------------------------------------------------------------------------|
| --platform | -p    | Platform to download for. "win32" (windows), "darwin" (mac), "linux" and "android" are supported. |
| --arch     | -a    | Architecture to download for. "x64", "x32" or "arm" Are supported. See below.                     |
| --chmod    | -c    | Does `chmod 777` on the binary making it executab                                                 |
| --ext      | -e    | Adds ".exe" to the path for the binary if on windows.                                             |
| --quiet    | -q    | Is silent except for errors.                                                                      |

Example: `get-aria2 win-32-aria2 -p win32 -a x32 -e`

Will download `aria2c` to `./win-32-aria2.exe`.

If no destination is provided will write to stdout.

## Platform/Architecture

* "darwin" (mac) - only supports "x64".
* "win32" (windows) - supports "x32" and "x64".
* "linux" - supports "x32", "x64" and "arm". Using "arm" with "linux" will download a binary built for the RaspberryPi.
* "android" - only supports "arm".

Using any combination not listed above will result in an error.

By default it will use your current platform and architecture.

## Programmatic Usage

This package contains a `getAria2(platform, arch)` function which will return a `Stream` containing the binary.

You can also programmatically get the path to `aria2c` by calling `aria2cPath()`.

There is an API documentation which you can generate by running `npm run docs`. A copy of the documentation is [available online here](https://get-aria2.docs.zacharyboyd.nyc).

## Tests

Tests are written in mocha. Run `npm test`.