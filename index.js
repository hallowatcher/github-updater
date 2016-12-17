//const app = require('electron').app;
const util = require('util');
const path = require('path');
const semver = require('semver');
const fs = require('fs');
const request = require('request');

const child = require('child_process');

const updater = {

    // The callback to run after checking
    callback: null,

    // The configuration
    config: {
        repository: null,
        version: null,
        downloadPath: null
    },

    // The update retrieved from github
    update: {
        version: null,
        source: null,
        file: null
    },

    // Initialize
    init: function (config) {
        this.config = util._extend(this.config, config);
    },

    // Check for an update
    check: function (callback) {
        if (callback) this.callback = callback;

        if (!this.config.repository)
            return this.end('Please specify the repo in the config!')

        if (!this.config.version)
            return this.end('Please specify the version in the config!');

        request.get(`https://api.github.com/repos/${this.config.repository}/releases`, (error, response, body) => {
            if (error) return this.end('Could not connect to repo!');
            
            try {
                var data = JSON.parse(body);

                if (!data) throw 'No data was received!';
                if (data.length === 0) throw 'No releases have been made!';
                if (!semver.valid(this.config.version)) throw 'The version specified is invalid!';
                if (!semver.valid(data[0].tag_name)) throw 'The latest release in github has an invalid tag version!';

                let localVer = semver.clean(this.config.version);
                let latestVer = semver.clean(data[0].tag_name);

                if (semver.gt(latestVer, localVer)) {
                    if (!data[0].assets) throw 'The latest version has no assets!';
                    let asset = data[0].assets.find(asset => asset.name.endsWith('.exe'));
                    if (!asset) throw 'The latest version has no asset that ends with ".exe"';

                    this.update.version = latestVer;
                    this.update.source = asset.browser_download_url;
                }

                return this.end();
            } catch (e) {
                this.end(e);
            }
        });

    },

    // Update
    download: function (callback) {
        if (callback) this.callback = callback;

        if (!this.update.ver || !this.update.source) return this.end('No updates in queue!');

        let url = this.update.source;
        let fileName = 'update.exe';

        let updateFile = path.join(resourcesPath, fileName);
        let updateFileStream = fs.createWriteStream(updateFile);
        request.get(url)
            .on('error', (error) => {
                return this.end(error);
            })
            .pipe(updateFileStream)
            .on('finish', () => {
                this.update.file = updateFile;
                setInterval(() => {
                    this.end();
                }, 2000);
                return;
            });
    },

    apply: function (callback) {
        if (callback) this.callback = callback;

        let updateExe = this.update.file;
        if (!updateExe) return this.end('Update file does not exist!');

        if (process.platform === 'win32') {
            child.spawn('cmd', ['/s', '/c', `"${updateExe}"`], { detached: true, windowsVerbatimArguments: true, stdio: 'ignore' }).unref();
            this.end();
        } else {
            return this.end('Only windows supported for now!');
        }
    },

    end: function (error) {
        if (typeof this.callback !== 'function') return false;

        this.callback.call(this, error, this.update.ver);
        this.callback = null;
    }

}

module.exports = updater;