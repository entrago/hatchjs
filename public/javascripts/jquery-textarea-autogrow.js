(function($) {

    /*
     * Auto-growing textareas; technique ripped from Facebook
     */
    $.fn.autogrow = function(options) {

        var update = function(e, el) {
            el          = el || this;
            var $el         = $(el);
            var minHeight   = $el.height();
            var lineHeight  = $el.css('lineHeight');

            var overflow = $el.css("overflow");
            $el.css("overflow", "hidden");

            var val = ($el.val() + "\n").replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/&/g, '&amp;')
                .replace(/\n/g, '<br/>');

            var shadow = getShadow($el);
            shadow.html(val);

            $el.css('height', Math.max(shadow.height() + 10 + parseInt($el.attr("padding") || 0), minHeight));
            $el.css("overflow", overflow);
        };

        var getShadow = function($el) {
            if(!$el.shadow || $el.shadow.length == 0) {
                $el.shadow = $('<div class="autogrow-shadow"></div>').css({
                    position:   'absolute',
                    top:        -10000,
                    left:       -10000,
                    width:      $el.width(),
                    padding:    $el.css("padding"),
                    margin:    $el.css("margin"),
                    border:    $el.css("border"),
                    fontSize:   $el.css('fontSize'),
                    fontFamily: $el.css('fontFamily'),
                    lineHeight: $el.css('lineHeight'),
                    resize:     'none'
                }).appendTo(document.body);
            }

            return $el.shadow;
        };

        //apply update to all textareas matched by the selector
        this.each(function() {
            update(null, this);
        });

        //attach the event handler
        this.on("change keyup keydown blur", update);

        return this;
    }

})(jQuery);