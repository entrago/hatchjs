var minSpanSize = 2;
var totalSpanSize = 12;
var colIndex = 0;

//column class initialiser
var Column = function(el, parent) {
    //don't crash on null columns
    if(!el) return;

    this.index = colIndex++;
    this.el = el;
    this.el.column = this;
    this.id = $(this.el).attr("id");
    this.columns = [];
    this.parent = parent;

    //create the subcolumns
    var cols = $(".column", this.el);
    if(cols.length > 0) {
        for(var i = 0; i<cols.length; i++) {
            this.columns.push(new Column(cols[i], this));
        }
    }

    //store the minimum size allowed for this column
    this.minSize = Math.max(this.columns.length, 1) * minSpanSize;

    //maximum size allowed for this column
    this.getMaxSize = function() {
        var cols = $("> .column", this.el.parentNode);
        var total = 0;
        var after = false;

        for(var i in cols) {
            if(cols[i].column == this) after = true;
            else if(cols[i].column) {
                total += after ? cols[i].column.minSize : cols[i].column.size;
            }
        }

        var parentTotalSpanSize = this.parent ? this.parent.getSize() : totalSpanSize;

        var maxSize = parentTotalSpanSize - total;
        return maxSize;
    }

    //gets the column size
    this.getSize = function() {
        if($(this.el).attr("class").indexOf("span") > -1) {
            return parseInt(($(this.el).attr("class")).substring($(this.el).attr("class").indexOf("span") + 4));
        }
        return 0;
    }

    this.size = this.getSize();
}

//gets the next column
Column.prototype.next = function() {
    var nextEl = $(this.el).next();
    if(nextEl.length > 0) return nextEl[0].column;
    else return null;
}

//gets the previous column
Column.prototype.prev = function() {
    var prevEl = $(this.el).prev();
    if(prevEl.length > 0) return prevEl[0].column;
    else return null;
}

//sets the size of a column
Column.prototype.setSize = function(size) {
    this.adjustSize(size - this.size);
}

//adjusts the size of a column
Column.prototype.adjustSize = function(delta, direction, stack) {
    //if there is no change, do nothing
    if(delta == 0) return true;

    //set the overall direction of resizing
    if(typeof direction == "undefined") direction = delta;

    //create the stack so that we don't change the same column twice
    if(typeof stack == "undefined") stack = [];

    if($.inArray(this.el, stack) > -1) return stack;
    else stack.push(this.el);

    //get the new size
    var size = this.size + delta;

    //if this column is greater than the max size, do nothing
    if(size > this.getMaxSize() && direction != 0) return false;

    //making the column larger - adjust columns to the right
    if(direction != 0) {
        if(delta > 0) {
            //resize the column to the right by -delta
            var next = this.next();
            if(next) next.adjustSize(-delta, direction, stack);
        }
        //making the column smaller - adjust columns to the left or right
        else if(delta < 0) {
            //check for space on the left
            if(direction < 0) {
                var spaceOnLeft = false;
                var prev = this;
                while(prev) {
                    if(prev.size > prev.minSize) spaceOnLeft = true;
                    prev = prev.prev();
                }

                if(!spaceOnLeft) return false;
            }

            //now resize the column to the right by -delta
            if(direction == delta) {
                var next = this.next();
                if(next) next.adjustSize(-delta, 0, stack);
            }

            //if we are trying to set a smaller than minSpanSize, try to resize the columns to the left
            if(size < this.minSize) {
                var diff = this.minSize - size;
                var prev = direction > 0 ? this.next() : this.prev();

                if(prev) prev.adjustSize(-diff, direction, stack);

                return true;
            }
        }
    }

    //set the size of the column
    this.size = size;
    $(this.el).removeClass("span1 span2 span3 span4 span5 span6 span7 span8 span9 span10 span11 span12").addClass("span" + size);

    //set the size of the sub-columns
    if(this.columns.length > 0) {
        var first = this.columns[0];
        while(first.size <= first.minSize && delta < 0)
        {
            first = first.next();
            if(!first) return false;
        }

        first.adjustSize(delta, 0, stack);
    }

    return true;
}

//drag and drop controller class
function DragDropController() {
    this.init();
}

//initialises everything to do with drag and drop
DragDropController.prototype.init = function() {
    if($(window).width() <= 480) return;

    this.makeColumnsResizable();
    this.makeModulesDraggable();
}
    
//makes columns resizable by dragging them
DragDropController.prototype.makeColumnsResizable = function() {

    //if we are using a template, don't allow column resizing
    if($(".using-template").length > 0) return;

    window.columns = [];

    //assign ids to each of the cols and attach events
    $(".column:not(.subcolumn)").each(function(i, col) {
        $(col).attr("id", "col-" + i);
        window.columns.push(new Column(col));
    });

    $(".column:not(:last-child)").resizable({
        helper: "ui-resizable-helper",
        handles: "e",
        resize: function(event, ui) {
            //some defaults
            var pageWidth = $(".container").outerWidth();
            var pageSpans = 12;
            var spanWidth = pageWidth / pageSpans;

            var col = ui.element;
            var parentEl = col.parent();
            var totalSpans = parseInt($(parentEl).outerWidth() / spanWidth);
            var cols = $("> .column", parentEl);

            var spanSize = parseInt(ui.size.width / spanWidth + 0.5);

            col[0].column.setSize(spanSize);
        },
        stop: function(event, ui) {
            //revert back to the span* width
            $(ui.element).css({ width: "", height: "" });

            //save via AJAX
            $(document).trigger('order-changed');
        }
    });
}

// makes modules draggable around the page
DragDropController.prototype.makeModulesDraggable = function () {
    $(".module-list").each(function () {
        var $m = $(this);
        if ($m.find('.module.not-editable-widget').size() === 0) {
            $m.addClass('editable');
        }
    });
    $(".module-list.editable").sortable({
        connectWith: ".module-list.editable",
        tolerance: "pointer",
        handle: ".move, h2",
        placeholder: "module-placeholder",
        stop: function (event, ui) {
            //if this is the new widget drag, ignore
            if(ui.item.is('span')) return;

            //save via AJAX
            $(document).trigger('order-changed');
        }
    });
}

