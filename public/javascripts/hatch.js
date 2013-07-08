//main javascript controllers
var search = new SearchController();

//pathTo is the client side routing function
window.pathTo = function pathTo(action) {
    return (window.location.pathname.split('/do/')[0] + '/do/' + action).replace('//', '/');
};

//init everything on page load
$(document).ready(function() {
    hatchInit();
    hatchModalInit();

    //PJAX - only allow for browsers that support replaceState
    if(window.history.replaceState) {
        $.pjax.enable();
        $.pjax.defaults.headers = { "Content-Type" : "" };
        $.pjax.defaults.dataType = "";

        $('#all').pjax('#main .nav a:not([rel=nopjax]), #main .breadcrumb a:not([rel=nopjax])');
        $('#all').on('pjax:end', function() { hatchInit(); })
    }

    //validation and default ajax handlers
    //redirect or show message
    $(document).on("ajax:success", '*[data-remote=true]', function(e, data) {
        var timeout = data.message && 2000 || 0;
        if (data.redirect) {
            console && console.error('Deprecated redirect to ' + data.redirect);
            setTimeout(function() {
                window.location = data.redirect;
            }, timeout);
        }
        if (data.message) {
            $.noty({
                type: data.status || 'success',
                text: '<i class="icon-' + (data.icon || 'ok') + '"></i> ' + data.message
            });
        }
    });
    //errors
    $(document).on("ajax:error", '*[data-remote=true]', function(xhr, status, error) {
        var data = JSON.parse(status.responseText);
        var message = '';
        var fields = [];

        //parse the error message
        if(typeof data.message != "string") {
            Object.keys(data.message).forEach(function(key, i) {
                var field = data.message[key];
                message += (field.message || field) + (i < Object.keys(data.message).length ? '<br/>':'');
                if(field.name) fields.push(field.name);
                else fields.push(key);
            });
        }
        else message = data.message;

        if (data.loginRequired) {
            //hide existing notys
            $('.noty_cont li').hide();

            //show the notification with noty with a link to login
            $.noty({
                type: data.status || 'alert',
                text: '<i class="icon-' + (data.icon || 'warning-sign') + '"></i> ' + message + '<div><a href="#login" data-toggle="modal">Sign in</a> or <a href="#register" data-toggle="modal">Register</a></div>',
                timeout: false,
                dismissQueue: true
            });
        }
    });

    //ajax modals
    $(document).on('click', "a[data-toggle=modal]", function (e) {
        target = $(this).attr('data-target');
        url = $(this).attr('href');
        if(url.indexOf('#') == -1) {
            $(target).load(url);
        }
    });

    //setup autogrow textarea
    $('.autogrow-shadow').remove();
    $("textarea[rel*=autogrow]").autogrow();

    //focus comment links on the textarea below
    $("a[rel=comment]").on("click", function() {
        var $post = $(this).parents("div[data-remote-id]:first");
        $post.find('.comments-and-likes').removeClass('hidden');
        $post.find("textarea").focus();
        return false;
    });

    //submit on enter textareas
    $("textarea[rel*=submitenter]").on("keypress", function(e) {
        if(e.charCode === 13 && !e.shiftKey) {
            $(this).parents("form").submit();
            return false;
        }
    });
    $("textarea[rel*=submitcommandenter]").on("focus", function() {
        var textarea = this;
        $(window).unbind('keydown').bind("keydown", function(e) {
            if(e.keyCode === 13 && (e.metaKey || e.ctrlKey)) {
                $(textarea).parents("form").submit();
            }
        });
    });
    $("textarea[rel*=submitcommandenter]").on("blur", function() {
        $(window).unbind("keydown");
    });

    $('body').on(
        'server:error', 'form[data-remote=true]',
        function(ev, error) {
            var $form = $(this), data;
            if ($form.is('form')) {
                data = $form.serializeArray();
            }
            var text;
            if (error.context) {
                text = t('errors.' + error.context + '.' + error.name);
            }
            if (!text && (error.name || error.message)) {
                text = t('errors.default.' + error.name, error.message);
            } else {
                text = 'An error has occured';
            }
            $.noty({
                type: 'error',
                text: '<i class="icon-warning-sign"></i> ' + text
            });
            if (error.codes && data) {
                var $el;
                for (var i = 0; i < data.length; i++) {
                    var name = data[i].name;
                    if (name in error.codes || name.replace(/^.*?\[|\]$/g, '') in error.codes) {
                        var $el = $form.find('[name="' + name + '"]');
                        // $el.addClass('validation-error');
                        $el.parents('.control-group').addClass('error');
                        $el.one('focus', function() {
                            $el.parents('.control-group').removeClass('error');
                        });
                    }
                }
            }
        });
});

//main init function
function hatchInit() {
    if($.fn.chosen) {
        $(".content .chzn-select-create").chosen({ 
            create_option: true,
            create_option_text: 'Press enter to add'
        });
        $(".content .chzn-select").chosen();
    }

    //show number of notifications pending
    displayPendingNotifications();

    //check to see if we should launch a modal
    if(window.location.hash && window.location.hash.length > 1) {
        if(window.location.hash.indexOf('/') > -1) return;

        try {
            var el = $(window.location.hash);
            if(el.hasClass('modal')) {
                el.modal();
            }
        } catch(ex) {
            //doesn't matter
        }
    }

    //setup the mouseover navbar
    $('.navbar-type-mouseover')
        .css({ opacity: 0, marginTop: '-30px' })
        .hoverIntent(
            function() {
                $(this).animate({ opacity: 1, marginTop: '0px' });
            },
            function() {
                $(this).animate({ opacity: 0, marginTop: '-30px' });
            }
    );

    //setup the mouseclick navbar
    $('.navbar-type-click')
        .css({ opacity: 0, marginTop: '-30px' })
        .click(function() {
            $(this).animate({ opacity: 1, marginTop: '0px' });
        })
        .hoverIntent(
        function() { },
        function() {
            $(this).animate({ opacity: 0, marginTop: '-30px' });
        }
    );

    $('.typeahead.dropdown-menu').remove();

    //setup popups
    $('a[rel=popup]').on('click', function() {
        window.open(this.href, '_popup', 'status = 1, height = 400, width = 600, resizable = 0');
        return false;
    });

    var isTouchDevice = 'ontouchstart' in document.documentElement;

    //only do certain things for non-mobile
    if(!isTouchDevice) {
        //initialise the search controller for search autocomplete
        search.init();

        //setup tooltips
        $("*[rel=tooltip]").tooltip();
        //hide tooltips on click to stop stray tooltips from hanging around
        $("*[rel=tooltip]").on("click", function() {
            $(".tooltip").hide();
        });
        $("*[rel=popover]").popover({ placement: "top", trigger: "hover", animation: false, delay: { show: 20, hide: 400 } });

        //setup hovercards
        $('*[rel=hovercard]').hovercard();

        //setup editing functionality
        if(typeof canEdit != 'undefined' && canEdit) {
            if($("#editConsoleHolder").length > 0)
            {
                //initialise drag and drop
                dragdrop.init();
            }

            //inline editing
            inlineedit.init();

            //setup the widget settings
            $('#modal-container').on('show', function() {
                if($('#modal-settings').length == 0) return;

                $('a[rel=widget-privacy]').bind('click', function() {
                    var value = JSON.parse($(this).attr('data-value'));
                    var input = $('#privacy');
                    var el = $('#widget-privacy');

                    el.find('.btn:first').text(value.name);
                    el.find('.btn').removeClass('btn-success btn-warning btn-danger').addClass('btn-' + value['class']);
                    input.val(value.value);

                    //close the dropdown
                    el.removeClass('open');

                    return false;
                });

                $('a[rel=widget-visibility]').bind('click', function() {
                    var value = JSON.parse($(this).attr('data-value'));
                    var input = $('#visibility');
                    var el = $('#widget-visibility');

                    el.find('.btn:first').text(value.name);
                    el.find('.btn').removeClass('btn-success btn-warning btn-danger').addClass('btn-' + value['class']);
                    input.val(value.value);

                    //close the dropdown
                    el.removeClass('open');

                    return false;
                });
            })

            toggleEditConsole = function(show) {
                if(typeof show == 'undefined') show = !$(".edit-console").is(":visible");

                //set the cookie
                $.cookie("edit-console-visible", show, { path : '/' });
                
                if(show) showEditConsole();
                else hideEditConsole();

            };

            //hides the edit console
            hideEditConsole = function() {
                $('#edit-page-link i.icon-eye-close').show();
                $('#edit-page-link i.icon-eye-open').hide();

                //set the cookie
                $.cookie("edit-console-visible", null, { path : '/' });

                $(".edit-console").fadeOut();
            }

            //shows the edit console
            showEditConsole = function() {
                $('#edit-page-link i.icon-eye-open').show();
                $('#edit-page-link i.icon-eye-close').hide();

                if($("#editConsole").length == 0) {
                    $("#editConsoleHolder").load(pathTo("admin/page/editconsole"), function() {
                        $(".edit-console").fadeIn();

                        //set the position
                        positionEditConsole();

                        //allow widget dragging
                        $("#edit-console-widgets li span.widget").draggable({ 
                            appendTo: 'body',
                            helper: function(event) {
                                return $('<div class="drag-helper">' + $(this).html() + '</div>');
                            },
                            connectToSortable: '.module-list.editable',
                            stop: function(event, ui) {
                                var widget = $('a', this).attr('href').replace('#', '');
                                var $el = $('.module-list .widget');

                                var row = $el.index();
                                var col = $el.parent().attr('id');

                                //if we don't have a column, give up
                                if(!col) return;

                                col = col.replace('col-', '');

                                //remove the placeholder
                                $el.remove();

                                //add the new widget
                                createWidget(widget, col, row);
                            }
                        });

                        //initialise style editor
                        var styleeditor = new StyleEditorController();
                        styleeditor.init();

                        //attach events
                        $(".edit-console .close").bind("click", hideEditConsole);
                        $(".edit-console").draggable({
                            handle: "div.console-header",
                            stop: function() {
                                $.cookie("edit-console-xy", JSON.stringify($(".edit-console").position()), { path : '/' });
                            }
                        });
                        $("#column-layout-choices input").bind("click", function() {
                            $('#templates-layouts, #columns-layouts').hide();
                            $('#' + this.value + '-layouts').show();
                        });
                    });
                }
                else {
                    $("#editConsole").fadeIn();
                    positionEditConsole();

                    //reload the layouts tab
                    $("#edit-console-layouts").load(pathTo("admin/page/editconsole?tab=layouts"));
                }
            }

            //positions the edit console with the value in the cookie
            positionEditConsole = function() {
                //position the edit console
                var editConsolePosition = $.cookie("edit-console-xy");
                if(editConsolePosition) {
                    editConsolePosition = JSON.parse(editConsolePosition);

                    //make sure the position is within the bounds of the window
                    if(editConsolePosition.left + $(".edit-console").outerWidth() > $(window).width()) editConsolePosition.left = Math.max(0, $(window).width() - $(".edit-console").outerWidth());
                    if(editConsolePosition.top + $(".edit-console").outerHeight() > $(window).height()) editConsolePosition.top = Math.max(0, $(window).height() - $(".edit-console").outerHeight());

                    $(".edit-console").css({left: editConsolePosition.left + "px", top: editConsolePosition.top + "px"});
                }
            }

            //show the edit console?
            if($("#editConsoleHolder").length > 0 && $.cookie("edit-console-visible")) {
                toggleEditConsole(true);
            }

            //edit console link
            $('#edit-page-link').click(function () {
                toggleEditConsole();
                return false;
            });
        }
    }
    else {
        // Set a timeout...
        setTimeout(function(){
            // Hide the address bar!
            window.scrollTo(0, 1);
        }, 0);

        //set a body class
        $('body').addClass('touch-screen');
    }

    $('a.dropdown-toggle, .dropdown-menu a').on('touchstart', function(e) {
      e.stopPropagation();
    });

    // fix sub nav on scroll
    var $win = $(window)
        , $nav = $('.subnav.fixed-top')
        , navHeight = ($('body.navbar-fixed').length > 0 && $('.navbar.navbar-fixed-top').height() || 0)
        , navTop = $('.subnav').length && $('.subnav').offset().top - navHeight
        , isFixed = 0

    if($nav.length > 0) {
        processScroll()

        $win.on('scroll', processScroll)

        function processScroll() {
            var i, scrollTop = $win.scrollTop()
            if (scrollTop >= navTop && !isFixed) {
                isFixed = 1
                $nav.addClass('subnav-fixed')
                $nav.css({ top: navHeight + 'px' });
            } else if (scrollTop <= navTop && isFixed) {
                isFixed = 0
                $nav.removeClass('subnav-fixed')
                $nav.css({ top: 'auto' });
            }
        }
    }
}

//sets up richtext editors with the default options
function setupRichtextEditors(selector, options) {
    if(!selector) selector = '.richtext';
    if(!options) options = {};

    //convert richtexts
    $(selector).each(function(i, el) {
        if($(el).data('redactor')) return;
        var editor = setupRichtextEditor(el, options);
    });

    //tie up the form events for richtext
    $(selector).each(function(i, el) {
        //get the form
        var form = el.form;
        var $el = $(el);
        $(form).bind('submit', function() {
            if ($el.getCode) {
                $el.val($el.getCode());
            }
        });
    });
}

//sets up a single richtext editor
function setupRichtextEditor(el, options) {
    //create the redactor modal
    window.$redactorModal = $('#redactor-modal');
    if(window.$redactorModal.length == 0) window.$redactorModal = $('<div class="modal" id="redactor-modal" style="display: none;"></div>').appendTo($('body'));

    if (typeof RLANG === 'undefined') {
        console && console.error('RLANG is not defined');
        return;
    }

    RLANG.image = 'Edit image';

    var editor = $(el).redactor($.extend({
        focus : false,
        minHeight : $(el).height() -30,
        convertDivs : false,
        fixed: false,
        modal_image_edit: '<label>' + RLANG.title + '</label>' +
            '<input id="redactor_file_alt" type="text" class="redactor_input" />' +
            '<label>' + RLANG.image_position + '</label>' +
            '<select id="redactor_form_image_align">' +
            '<option value="none">' + RLANG.none + '</option>' +
            '<option value="left">' + RLANG.left + '</option>' +
            '<option value="right">' + RLANG.right + '</option>' +
            '</select>' +
            '<div id="redactor_modal_footer" style="overflow: visible;">' +
            '<div class="modal-footer" style="margin: 0 -30px -20px; padding: 15px 23px;">' +
            '<div class="btn-toolbar pull-left" style="margin : 0;">' +
            '<div class="btn-group">' +
            '<a href="javascript:void(null);" id="redactor_image_delete_btn" style="color: #000;" class="btn">' + RLANG._delete + '</a>' +
            '</div>' +
            '</div>' +
            '<div class="btn-toolbar" style="margin : 0;">' +
            '<div class="btn-group">' +
            '<button type="button" name="save" id="redactorSaveBtn" class="btn btn-primary">' + RLANG.save + '</button>' +
            '</div>' +
            '<div class="btn-group">' +
            '<a href="javascript:void(null);" id="redactor_btn_modal_close" class="btn">' + RLANG.cancel + '</a>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>',
        buttonsCustom: {
            //override the image button
            image: {
                title: 'Insert image...',
                callback: function(obj, event, key) {
                    editor.data('redactor').saveSelection();
                    window.redactor = editor;
                    window.$redactorModal.load(pathTo('admin/page/image'), {
                        success: function() {
                            window.$redactorModal.modal();
                        }
                    });
                }
            },
            //override the link button
            link: {
                title: 'Link',
                callback: function(obj, event, key) {
                    editor.data('redactor').saveSelection();
                    window.redactor = editor;
                    window.$redactorModal.load(pathTo('admin/page/link'), {
                        success: function() {
                            window.$redactorModal.modal();
                        }
                    });
                }
            }
        }
    }, options || {}));

    editor.after('<div class="clearfix"></div>');

    return editor;
}

function hatchModalInit() {
    if($.fn.chosen) {
        $(".modal-body .chzn-select-create").chosen({ create_option: true });
        $(".modal-body .chzn-select").chosen();
    }
}

// displays pending notifications for this user
function displayPendingNotifications() {
    if($('#notifications-menu-link').length == 0) return;

    //do nothing if there is no logged in user
    var userId = $('meta[name=userid]').attr('content');
    if(!userId) return;

    var notificationsCount = $.cookie('notificationsCount');
    if(notificationsCount != null) {
        setNotificationsCount(notificationsCount);
    }
    else {
        $.ajax({
            url: pathTo('notifications/count'),
            success: function(data) {
                //set the cookie - expire after 5 mins
                var expiry = new Date(new Date().getTime() + 5 * 60000);
                $.cookie('notificationsCount', data.count || 0, { path: '/', expires: expiry });

                //show the number of notifications
                setNotificationsCount(data.count);
            }
        });
    }

    function setNotificationsCount(count) {
        //remove existing notification count
        $('#notifications-menu-link .badge').remove();

        //display new notification count
        if(count > 0) $('#notifications-menu-link span').append(' <small class="badge badge-important">' + count + '</small>');
    }

    //setup notifications menu
    $('#notifications-menu-link').on('click', function() {
        loadNotificationsMenu();
    });

    function loadNotificationsMenu(clickId) {
        var url = pathTo('notifications/list');
        if(clickId) url = pathTo('notifications/click/') + clickId;

        $.ajax({
            url: url,
            success: function(data) {
                //kill the cookie
                $.cookie('notificationsCount', null, { path: '/' });

                //remove the count
                $('#notifications-menu-link .badge').remove();

                $('#notifications-menu').html(data);
                $('#notifications-menu a[data-remote=true]').on('click', function() {
                    //re-open the menu
                    setTimeout(function() {
                        $('#notifications-menu').parents('.dropdown').addClass('open');
                    }, 1);
                });
                $('#notifications-menu a[data-remote=true]').on('ajax:success', function(e, data) {
                    $.noty({
                        type: data.status,
                        text: '<i class="icon-' + (data.icon || 'ok') + '"></i> ' + data.message
                    });

                    //refresh the menu
                    loadNotificationsMenu($(this).parents('.notification').attr('data-id'));
                });
            }
        });
    }
}

function fixImageWidths() {
    var images = $('img');
    images.each(function(i, img) {
        //if image dimensions are not explictly defined, add them
        if(img.src && img.src.indexOf('dim=') == -1) {
            var $img = $(img);
            var width = $img.width();

            if(!width) {
                $parent = $img.parent();

                while(!width) {
                    width = $parent.width();
                    $parent = $parent.parent();
                }
            }

            if(width > 16 && !$img.height()) { 
                var dim = '0x' + width;
                $img.attr('src', $img.attr('src') + ($img.attr('src').indexOf('?') > -1 ? '&':'?') + 'dim=' + dim);
            }
        }
    });
}
