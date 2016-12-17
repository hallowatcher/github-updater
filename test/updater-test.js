

const assert = require('assert');
const proxyquire =  require('proxyquire');
const sinon = require('sinon');

var requestStub = {};
var updater = proxyquire('../index', { 'request': requestStub });

describe('updater with valid settings', function () {

    // Test settings
    let repo = "test/repo";
    let ver = "0.0.9";
    let path = "./";

    beforeEach(function () {
        updater.init({
            repository: repo,
            version: ver,
            downloadPath: path
        });
    });

    it('should initialize the module', function () {
        assert(updater.config.repository === repo);
        assert(updater.config.version === ver);
        assert(updater.config.downloadPath === path);

    });

    it('should get from the right repository', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            assert(url.includes(repo));
        });

        updater.check();

        get.restore();
    });

    it('should check empty response array from github releases', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, "[]");
        });

        updater.check(function (error) {
            assert.equal(error, 'No releases have been made!');
        });

        get.restore();
    });

    it('should check for invalid tag name from github releases', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: 'a.b.c'}]));
        });

        updater.check(function (error) {
            assert.equal(error, 'The latest release in github has an invalid tag version!');
        });

        get.restore();
    });

    it('should find no later version', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.0.8'}]));
        });

        updater.check(function (error, ver) {
            assert(!ver);
        });

        get.restore();
    });

    it('should find no assets', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.1.0'}]));
        });

        updater.check(function (error) {
            assert.equal(error, 'The latest version has no assets!');
        });

        get.restore();
    });

    it('should find no asset that ends with .exe', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.1.0', assets: []}]));
        });

        updater.check(function (error) {
            assert.equal(error, 'The latest version has no asset that ends with ".exe"');
        });

        get.restore();
    });

    it('should find update with no error', function () {
        var get = sinon.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([ { tag_name: '0.1.0', assets: [{name: "blabla.exe", browser_download_url: 'thesource'}] } ]));
        });

        updater.check(function (error) {
            assert(!error);
            assert.equal(updater.update.version, '0.1.0' );
            assert.equal(updater.update.source, 'thesource');
        });

        get.restore();
    });

});