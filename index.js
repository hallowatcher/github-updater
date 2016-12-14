const app = require('electron').app;
const util = require('util');
const path = require('path');
const rest = require('restler');
const semver = require('semver');
const appRoot = app.getAppPath();

const updater = {

    // The callback to run after checking
    callback: null,
    
    // The configuration
    config: {
        repo: null
    },

    // The update retrieved from github
    update: {
        ver: null,
        source: null
    },

    // Initialize
    init: function (config) {
        this.config = util._extend(this.config, config);
    },

    // Check for an update
    check: function (callback) {
        if (callback) this.callback = callback;

        if (!this.config.repo) 
            return this.end('The repo has not been defined!')

        let package = require(path.join(appRoot, 'package.json'));
        if (!package.version)
            return this.end('This app\'s version could not be detected!');
        
        rest.get(`https://api.github.com/repos/${this.config.repo}/releases`).on('complete', (data) => {
            if (data instanceof Error) return this.end('Could not connect to repo!');

            try {
                if (!data) throw 'No data was received!';
                if (data.length === 0) throw 'No releases have been made!';
                if (!semver.valid(package.version)) throw 'The version specified in package.json is invalid!';
                if (!semver.valid(data[0].tag_name)) throw 'The latest release has an invalid tag version!';

                let localVer = semver.clean(package.version);
                let latestVer = semver.clean(data[0].tag_name);

                if (semver.gt(latestVer, localVer)) {
                    let asset = data[0].assets.find(asset => asset.name.endsWith('update.asar'));
                    if (!asset) throw 'The latest version has no asset that ends with "update.asar"';

                    this.update.ver = latestVer;
                    this.update.source = asset.browser_download_url;
                }

                return this.end();
            } catch (e) {
                this.end(e);
            }
        });

    },

    // Update
    update: function () {
        // Stub
    },

    end: function (error) {
        if (typeof this.callback !== 'function') return false;

        this.callback.call(this, error, this.update.ver);
    }

}

module.exports = updater;