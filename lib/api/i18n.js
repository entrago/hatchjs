module.exports = InternationalizationAPI;

function InternationalizationAPI(hatch) {
    var i18n = this;
    this.translations = {};
    this.pauseLocalesBundle = null;

    hatch.compound.on('ready', function () {
        i18n.update(i18n.hatch.compound);
    });

    hatch.compound.on('module', function(module) {
        i18n.update(module.compound);
    });
}

InternationalizationAPI.prototype.update = function(compound) {
    var i18n = this;

    this.clone(this.translations, compound.__localeData);
    if (this.pauseLocalesBundle) {
        clearTimeout(pauseLocalesBundle);
    }
    this.pauseLocalesBundle = setTimeout(function() {
        var t = fs.readFileSync(__dirname + '/i18n-template.js').toString();
        // console.log('writing /javascripts/i18n.js');
        fs.writeFileSync(
            compound.root + '/public/javascripts/i18n.js',
            t.replace('{{ i18n }}', JSON.stringify(i18n.translations)));
    }, 2000);
};

InternationalizationAPI.prototype.clone = function clone(base, source) {
    var i18n = this;
    if (source) {
        Object.keys(source).forEach(function (key) {
            if ('object' === typeof source[key]) {
                if (!(key in base)) base[key] = {};
                i18n.clone(base[key], source[key]);
            } else {
                base[key] = source[key];
            }
        });
    }
    return base;
};
