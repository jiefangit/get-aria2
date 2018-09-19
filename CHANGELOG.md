# Changelog

## [1.0.8] - 2018-09-19
### Changed

- Addresses [issue #1](https://github.com/znetstar/get-aria2/issues/1) fixing a bug with the line-endings on some files being set to CRLF.

## [1.0.7] - 2018-09-18
### Changed

- Fixes a bug that occurs when running `npm install` and `npm test` on Windows.

## [1.0.5] - 2018-09-18

### Changed
- Removes "proxy-agent" because of a bug. SOCKS proxys are no longer. HTTP proxies are still supported.

## [1.0.4] - 2018-09-17

## [1.0.3] - 2018-09-17

### Changed
- Fixes a bug caused by the "unzip" module. Replaces "unzip" with "node-unzip-2".

## [1.0.2] - 2018-09-17

### Added
- Adds a function, `aria2cPath` which will return the path to aria2c.

### Changed
- Fixes a bug running on Windows

## [1.0.0] - 2018-09-17
### Added
- Added a command-line tool for downloading the latest version of aria2 from GitHub.