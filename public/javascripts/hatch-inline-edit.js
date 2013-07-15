//inline edit controller class
function InlineEditController() {

}

//initialises inline editing
InlineEditController.prototype.init = function() {
    function titleEdit() {
        var el = $(this);
        var title = el.text();

        if($("input", el).length > 0) return;

        //replace with an input
        var input = $('<input type="text" value="' + title + '" />');
        el.html(input);
        input.focus();
        input.selectRange(input.val().length, input.val().length);

        //save on enter
        input.bind("keypress", function(e) {
            if(e.which == 13) {
                var title = input.val();

                var $widget = el.closest('.module');
                var widgetId = $widget.attr('data-id');

                send('core-widgets/widget/' + widgetId + '/settitle', {
                    _method: 'PUT',
                    title: title
                }, function (data) {
                    $.noty({text: "<i class='icon-ok'></i> Widget title updated", type: "success"});

                    if(title) el.html(title);
                    else el.remove();
                });
            }
        });

        //revert on loss of focus
        input.bind("blur", function(e) {
            el.html(title);
        });
    }

    function inlineEdit() {
        if ($(this).data("active")) return;
        $(this).data("active", true);

        var $el = $(this);
        var html = $el.data('html');
        if(typeof html == 'undefined' || !html) html = $el.html() || '';

        //replace the content with a textarea
        var textarea = $("<textarea>" + html + "</textarea>");
        $(textarea).css({ width: $(this).outerWidth() + "px", height: $(this).outerHeight() + 80 + "px" });

        var $saveButton = $('<button type="submit" class="btn btn-primary">Save changes</button>');
        var $cancelButton = $('<button class="btn">Cancel</button>');
        var $buttons = $('<div class="form-actions"></div>');

        $buttons.append($saveButton).append(" ").append($cancelButton);

        $(this).html(textarea);
        $(this).append($buttons);

        destroyEditor = function() { };
         
        //attach the button events
        $cancelButton.bind("click", function() {
            //show notification
            $.noty({text: "<i class='icon-info-sign'></i> Widget contents have been reverted", type: "alert"});

            //hide resize selectors
            $(".resize-selector, .resize-region").remove();

            $el.html(html); 
            $el.removeData("active");

            $el.hide().fadeIn();
        });

        $saveButton.bind("click", function() {
            //hide resize selectors
            $(".resize-selector, .resize-region").remove();

            //set the new html
            destroyEditor();
            $el.data('html', textarea.val());
            $el.html(textarea.val());
            $el.removeData("active");

            //trigger save to database
            $el.trigger('contents-updated');
        });

        //hack: clear any selection
        if (window.getSelection) window.getSelection().removeAllRanges();
        else if (document.selection) document.selection.empty();

        //html editor - ACE
        if($el.hasClass('html')) {
            function setupEditor() {
                var parent = $('<div></div>');
                var div = $('<div><div>');
                div.attr('id', new Date().getTime() + 'textarea');
                div.css({ height: '210px', width: $el.width() + 'px' });
                parent.css({ height: '200px'});

                parent.append(div);
                parent.insertAfter(textarea);
                textarea.hide();

                var editor = ace.edit(div[0].id);
                editor.setValue(textarea.val());
                editor.getSession().setMode("ace/mode/html");
                editor.clearSelection();

                destroyEditor = function() {
                    textarea.val(editor.getValue());
                };
            }

            if(typeof ace == 'undefined') {
                $.getScript('/javascripts/ace/ace.js', function() {
                    ace.config.set('basePath', "/javascripts/ace/");
                    setupEditor();
                });
            }
            else {
                setupEditor();
            }
        }
        //richtext editor - redactor
        else {
            var editor = setupRichtextEditor(textarea, {
                autoresize : true,
                css : "inline.css",
                minHeight : false
            });

            destroyEditor = function() {
                editor.destroyEditor();
            };
        }

        return false;
    }

    $(".module:not(.not-editable-widget) .inline-edit").on("dblclick", inlineEdit);
    $(".inline-edit-link").on("click", function() {
        var widget = $(this).parents(".module");
        var content = $(".inline-edit", widget);

        inlineEdit.apply(content);

        return false;
    });

    $(".module:not(.not-editable-widget) .content > h2").on("dblclick", titleEdit);
}
