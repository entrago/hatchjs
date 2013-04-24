if ('undefined' === typeof hatch) var hatch = {};
hatch.__i18n = {};
hatch.__locale = 'en';

function t(path, substitute) {
    var translation = hatch.__i18n[hatch.__locale], substitute;

    function nextPathItem(token) {
        return (translation = translation[token]);
    }

    if (!translation || !path.split('.').every(nextPathItem)) {
        translation = translationMissing(hatch.__locale, path);
    }

    if (translation && substitute && substitute.length) {
        substitute.forEach(function(substitution) {
            translation = translation.replace(/%/, substitution.toString().replace(/%/g, ''));
        });
    }

    return translation;
}

$(function() {
    var locale = $('html').attr('lang');
    if (locale) {
        hatch.__locale = locale;
    }
});

hatch.__i18n = {{ i18n }};
