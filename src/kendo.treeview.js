(function ($) {
    var kendo = window.kendo,
        ui = kendo.ui,
        extend = $.extend,
        template = kendo.template,
        Component = ui.Component,
        proxy = $.proxy,
        SELECT = "select",
        EXPAND = "expand",
        COLLAPSE = "collapse",
        CHECKED = "checked",
        ERROR = "error",
        LOAD = "load",
        DATABINDING = "dataBinding",
        DATABOUND = "dataBound",
        DRAGSTART = "dragstart",
        DRAG = "drag",
        NODEDRAGCANCELLED = "nodeDragCancelled",
        DROP = "drop",
        DRAGEND = "dragend",
        CLICK = "click",
        CHANGE = "change",
        VISIBILITY = "visibility",
        TSTATEHOVER = "t-state-hover",
        TTREEVIEW = "t-treeview",
        TITEM = "t-item",
        VISIBLE = ":visible",
        NODE = ".t-item",
        SUBGROUP = ">.t-group,>.t-animation-container>.t-group",
        NODECONTENTS = SUBGROUP + ",>.t-content,>.t-animation-container>.t-content";

    var TreeView = Component.extend({
        init: function (element, options) {
            var that = this,
                element = $(element),
                clickableItems = ".t-in:not(.t-state-selected,.t-state-disabled)",
                dataInit;

            options = $.isArray(options) ? (dataInit = true, { dataSource: options }) : options;

            Component.prototype.init.call(that, element, options);

            options = that.options;

            if (options.animation === false) {
                options.animation = {
                    expand: { show: true, effects: {} },
                    collapse: { hide: true, effects: {} }
                };
            }

            // render treeview if it's not already rendered
            if (!element.hasClass(TTREEVIEW)) {
                that._wrapper();

                if (!that.root.length) { // treeview initialized from empty element
                    that.root = that.wrapper.html(TreeView.renderGroup({
                        items: options.dataSource,
                        group: {
                            firstLevel: true,
                            expanded: true
                        },
                        treeview: {}
                    })).children("ul");
                } else {
                    that._group(that.wrapper);
                }
            } else {
                // otherwise just initialize properties
                that.wrapper = element;
                that.root = element.children("ul").eq(0);
            }

            that.wrapper
                .delegate(".t-in.t-state-selected", "mouseenter", function(e) { e.preventDefault(); })
                .delegate(clickableItems, "mouseenter", function () { $(this).addClass(TSTATEHOVER); })
                .delegate(clickableItems, "mouseleave", function () { $(this).removeClass(TSTATEHOVER); })
                .delegate(clickableItems, CLICK, proxy(that._nodeClick, that))
                .delegate("div:not(.t-state-disabled) .t-in", "dblclick", proxy(that._toggleButtonClick, that))
                .delegate(".t-plus,.t-minus", CLICK, proxy(that._toggleButtonClick, that));

            if (options.dragAndDrop) {
                that.bind([DRAGSTART, DRAG, DROP, DRAGEND], options);
                that.dragging = new TreeViewDragAndDrop(that);
            }

            that.bind([EXPAND, COLLAPSE, CHECKED, ERROR, LOAD, DATABINDING, DATABOUND, SELECT], options);
        },

        options: {
            dataSource: {},
            animation: {
                expand: {
                    effects: "expandVertical",
                    duration: 200,
                    show: true
                },
                collapse: {
                    duration: 100,
                    show: false,
                    hide: true
                }
            }
        },

        _trigger: function (eventName, node) {
            return this.trigger(eventName, {
                node: node.closest(NODE)[0]
            });
        },

        _toggleButtonClick: function (e) {
            this.toggle($(e.target).closest(NODE));
        },

        _nodeClick: function (e) {
            var that = this,
                node = $(e.target),
                contents = node.closest(NODE).find(NODECONTENTS),
                href = node.attr("href"),
                shouldNavigate;

            if (href) {
                shouldNavigate = href == "#" || href.indexOf("#" + this.element.id + "-") >= 0;
            } else {
                shouldNavigate = contents.length > 0 && contents.children().length == 0;
            }

            if (shouldNavigate) {
                e.preventDefault();
            }

            if (!node.hasClass(".t-state-selected") && !that._trigger("select", node)) {
                that.select(node);
            }
        },

        _wrapper: function() {
            var that = this,
                element = that.element,
                wrapper, root,
                wrapperClasses = "t-widget t-treeview t-reset";

            if (element.is("div")) {
                wrapper = element.addClass(wrapperClasses);
                root = wrapper.children("ul").eq(0);
            } else { // element is ul
                wrapper = element.wrap('<div class="' + wrapperClasses + '" />').parent();
                root = element;
            }

            that.wrapper = wrapper;
            that.root = root;
        },

        _group: function(item) {
            var that = this,
                firstLevel = item.hasClass(TTREEVIEW),
                group = {
                    firstLevel: firstLevel,
                    expanded: firstLevel || item.data("expanded") === true
                },
                groupElement = item.find("> ul");

            groupElement
                .addClass(TreeView.rendering.groupCssClass(group))
                .css("display", group.expanded ? "" : "none");

            that._items(groupElement, group);
        },

        _items: function(groupElement, groupData) {
            var that = this,
                items = groupElement.find("> li"),
                nodeData;

            groupData = extend({ length: items.length }, groupData);

            items.each(function(i, node) {
                node = $(node);

                nodeData = { index: i, expanded: node.data("expanded") === true };

                that._updateNodeHtml(node);

                that._updateNodeClasses(node, groupData, nodeData);

                // iterate over child items
                that._group(node);
            });
        },

        _updateNodeHtml: function(node) {
            var wrapper = node.find(">div"),
                subGroup = node.find(">ul"),
                toggleButton = wrapper.find(">.t-icon"),
                innerWrapper = wrapper.find(">.t-in");

            if (!wrapper.length) {
                wrapper = $("<div />").prependTo(node);
            }

            if (!toggleButton.length && subGroup.length) {
                toggleButton = $("<span class='t-icon' />").prependTo(wrapper);
            } else if (!subGroup.length || !subGroup.children().length) {
                toggleButton.remove();
                subGroup.remove();
            }

            if (!innerWrapper.length) {
                innerWrapper = $("<span class='t-in' />").appendTo(wrapper)[0];

                // move all non-group content in the t-in container
                currentNode = wrapper[0].nextSibling;
                innerWrapper = wrapper.find(".t-in")[0];

                while (currentNode && currentNode.nodeName.toLowerCase() != "ul") {
                    tmp = currentNode;
                    currentNode = currentNode.nextSibling;
                    innerWrapper.appendChild(tmp);
                }
            }
        },

        _updateNodeClasses: function(node, groupData, nodeData) {
            var helpers = TreeView.rendering,
                wrapper = node.find(">div"),
                subGroup = node.find(">ul")

            if (!nodeData) {
                nodeData = {
                    expanded: !(subGroup.css("display") == "none"),
                    index: node.index(),
                    enabled: !wrapper.find(">.t-in").hasClass("t-state-disabled")
                };
            }

            if (!groupData) {
                groupData = {
                    firstLevel: node.parent().parent().hasClass(TTREEVIEW),
                    length: node.parent().children().length
                };
            }

            // li
            node.removeClass("t-first t-last")
                .addClass(helpers.wrapperCssClass(groupData, nodeData));

            // div
            wrapper.removeClass("t-top t-mid t-bot")
                   .addClass(helpers.cssClass(groupData, nodeData));

            // toggle button
            if (subGroup.length) {
                wrapper.find(">.t-icon").removeClass("t-plus t-minus t-plus-disabled t-minus-disabled")
                    .addClass(helpers.toggleButtonClass(nodeData));

                subGroup.addClass("t-group");
            }
        },

        processItems: function(items, callback) {
            var that = this;
            that.element.find(items).each(function(index, item) {
                callback.call(that, index, $(item).closest(NODE));
            });
        },

        expand: function (items) {
            this.processItems(items, function (index, item) {
                var contents = item.find(NODECONTENTS);

                if (contents.length > 0 && !contents.is(VISIBLE)) {
                    this.toggle(item);
                }
            });
        },

        collapse: function (items) {
            this.processItems(items, function (index, item) {
                var contents = item.find(NODECONTENTS);

                if (contents.length > 0 && contents.is(VISIBLE)) {
                    this.toggle(item);
                }
            });
        },

        enable: function (items, enable) {
            enable = arguments.length == 2 ? !!enable : true;

            this.processItems(items, function (index, item) {
                var isCollapsed = !item.find(NODECONTENTS).is(VISIBLE);

                if (!enable) {
                    this.collapse(item);
                    isCollapsed = true;
                }

                item.find("> div > .t-in")
                        .toggleClass("t-state-default", enable)
                        .toggleClass("t-state-disabled", !enable)
                    .end()
                    .find("> div > .t-icon")
                        .toggleClass("t-plus", isCollapsed && enable)
                        .toggleClass("t-plus-disabled", isCollapsed && !enable)
                        .toggleClass("t-minus", !isCollapsed && enable)
                        .toggleClass("t-minus-disabled", !isCollapsed && !enable);
            });
        },

        select: function (node) {
            node = $(node).closest(NODE);

            if (node.length) {
                this.element.find(".t-in").removeClass("t-state-hover t-state-selected");

                node.find(".t-in:first").addClass("t-state-selected");
            }
        },

        selected: function() {
            return this.element.find(".t-state-selected").closest(NODE);
        },

        toggle: function (node) {
            if (node.find(".t-minus,.t-plus").length == 0) {
                return;
            }

            if (node.find("> div > .t-state-disabled").length) {
                return;
            }

            var that = this,
                contents = node.find(NODECONTENTS),
                isExpanding = !contents.is(VISIBLE)
                animationSettings = that.options.animation,
                animation = animationSettings.expand,
                collapse = animationSettings.collapse,
                hasCollapseAnimation = collapse && 'effects' in collapse;

            if (!isExpanding) {
                animation = hasCollapseAnimation ? collapse
                                    : extend({ reverse: true }, animation, { show: false, hide: true });
            }

            if (contents.children().length > 0) {
                if (!that._trigger(isExpanding ? "expand" : "collapse", node)) {
                    node.find("> div > .t-icon")
                        .toggleClass("t-minus", isExpanding)
                        .toggleClass("t-plus", !isExpanding);

                    if (!isExpanding) {
                        contents.css("height", contents.height()).css("height");
                    }

                    contents.kendoStop(true, true).kendoAnimate(animation);
                }
            }
        },

        text: function (node) {
            return $(node).closest(NODE).find(">div>.t-in").text();
        },

        _insertNode: function(nodeData, index, parentNode, group, insertCallback) {
            var that = this,
                updatedGroupLength = group.children().length + 1,
                fromNodeData = $.isPlainObject(nodeData),
                groupData = {
                    firstLevel: parentNode.hasClass(TTREEVIEW),
                    expanded: true,
                    length: updatedGroupLength
                }, node;

            if (fromNodeData) {
                node = $(TreeView.renderItem({
                    group: groupData,
                    item: extend(nodeData, { index: index })
                }));
            } else {
                node = $(nodeData);

                if (node.closest(".t-treeview")[0] == that.wrapper[0]) {
                    that.remove(node);
                }
            }

            if (!group.length) {
                group = $(TreeView.renderGroup({
                    group: groupData
                })).appendTo(parentNode);
            }

            insertCallback(node, group);

            if (parentNode.hasClass("t-item")) {
                that._updateNodeHtml(parentNode);
                that._updateNodeClasses(parentNode);
            }

            if (!fromNodeData) {
                that._updateNodeClasses(node);
            }

            that._updateNodeClasses(node.prev());
            that._updateNodeClasses(node.next());

            return node;
        },

        insertAfter: function (nodeData, referenceNode) {
            var group = referenceNode.parent();

            return this._insertNode(nodeData, referenceNode.index() + 1, group.parent(), group, function(item, group) {
                item.insertAfter(referenceNode);
            });
        },

        insertBefore: function (nodeData, referenceNode) {
            var group = referenceNode.parent();

            return this._insertNode(nodeData, referenceNode.index(), group.parent(), group, function(item, group) {
                item.insertBefore(referenceNode);
            });
        },

        append: function (nodeData, parentNode) {
            parentNode = parentNode || this.element;

            var group = parentNode.find(SUBGROUP);

            return this._insertNode(nodeData, group.children().length, parentNode, group, function(item, group) {
                item.appendTo(group);
            });
        },

        remove: function (node) {
            node = $(node);

            var that = this,
                parentNode = node.parent().parent(),
                prevSibling = node.prev(),
                nextSibling = node.next();

            node.remove();

            if (parentNode.hasClass("t-item")) {
                that._updateNodeHtml(parentNode);
                that._updateNodeClasses(parentNode);
            }

            that._updateNodeClasses(prevSibling);
            that._updateNodeClasses(nextSibling);
        },

        findByText: function (text) {
            var result;

            $(".t-in", this.element).each(function() {
                var that = $(this);
                if (that.text() == text) {
                    result = that.closest(NODE);
                    return false;
                }
            });

            return result;
        }
    });

    function TreeViewDragAndDrop(treeview) {
        var that = this;

        that.treeview = treeview;

        that._draggable = new ui.Draggable(treeview.element, {
           filter: "div:not(.t-state-disabled) .t-in",
           hint: function(node) {
                return "<div class='t-header t-drag-clue'><span class='t-icon t-drag-status'></span>" + node.text() + "</div>";
           },
           dragstart: proxy(that.dragstart, that),
           drag: proxy(that.drag, that),
           dragend: proxy(that.dragend, that)
        });
    }

    TreeViewDragAndDrop.prototype = {
        _hintStatus: function(newStatus) {
            var statusElement = this._draggable.hint.find(".t-drag-status")[0];
            
            if (newStatus) {
                statusElement.className = "t-icon t-drag-status " + newStatus;
            } else {
                return $.trim(statusElement.className.replace(/t-(icon|drag-status)/g, ""));
            }
        },

        dragstart: function (e) {
            var that = this,
                treeview = that.treeview,
                sourceNode = that.sourceNode = e.currentTarget.closest(NODE);

            if (treeview.trigger(DRAGSTART, { sourceNode: sourceNode[0] })) {
                return false;
            }

            that.dropHint = $("<div class='t-drop-hint' />")
                .css(VISIBILITY, "hidden")
                .appendTo(treeview.element);
        },
        drag: function (e) {
            var that = this,
                treeview = that.treeview,
                sourceNode = that.sourceNode,
                dropTarget = that.dropTarget = $(e.target),
                statusClass,
                hoveredItem, hoveredItemPos, itemHeight, itemTop, itemContent, delta,
                insertOnTop, insertOnBottom, addChild;

            if (!$.contains(treeview.wrapper[0], dropTarget[0])) {
                // dragging node outside of treeview
                statusClass = "t-denied";
            } else if ($.contains(sourceNode[0], dropTarget[0])) {
                // dragging node within itself
                statusClass = "t-denied";
            } else {
                // moving or reordering node
                statusClass = "t-insert-middle";

                that.dropHint.css(VISIBILITY, "visible");

                hoveredItem = dropTarget.closest(".t-top,.t-mid,.t-bot");

                if (hoveredItem.length > 0) {
                    itemHeight = hoveredItem.outerHeight();
                    itemTop = hoveredItem.offset().top;
                    itemContent = dropTarget.closest(".t-in");
                    delta = itemHeight / (itemContent.length > 0 ? 4 : 2);

                    insertOnTop = e.pageY < (itemTop + delta);
                    insertOnBottom = (itemTop + itemHeight - delta) < e.pageY;
                    addChild = itemContent.length > 0 && !insertOnTop && !insertOnBottom;

                    itemContent.toggleClass(TSTATEHOVER, addChild);
                    that.dropHint.css(VISIBILITY, addChild ? "hidden" : "visible");

                    if (addChild) {
                        statusClass = "t-add";
                    } else {
                        hoveredItemPos = hoveredItem.position();
                        hoveredItemPos.top += insertOnTop ? 0 : itemHeight;

                        that.dropHint
                            .css(hoveredItemPos)
                            [insertOnTop ? "prependTo" : "appendTo"](dropTarget.closest(NODE).find("> div:first"));

                        if (insertOnTop && hoveredItem.hasClass("t-top")) {
                            statusClass = "t-insert-top";
                        }

                        if (insertOnBottom && hoveredItem.hasClass("t-bot")) {
                            statusClass = "t-insert-bottom";
                        }
                    }
                }
            }

            treeview.trigger(DRAG, {
                sourceNode: sourceNode[0],
                dropTarget: dropTarget[0],
                pageY: e.pageY,
                pageX: e.pageX,
                statusClass: statusClass.substring(2),
                setStatusClass: function (value) { statusClass = value }
            });

            if (statusClass.indexOf("t-insert") != 0) {
                that.dropHint.css(VISIBILITY, "hidden");
            }

            that._hintStatus(statusClass);
        },

        dragend: function (e) {
            var that = this,
                treeview = that.treeview,
                dropPosition = "over",
                sourceNode = that.sourceNode,
                destinationNode,
                isValid, isDropPrevented;

            if (e.keyCode == kendo.keys.ESC){
                that.dropHint.remove();
                //treeview.trigger("nodeDragCancelled", { item: sourceNode[0] });
            } else {
                if (that.dropHint.css(VISIBILITY) == "visible") {
                    dropPosition = that.dropHint.prevAll(".t-in").length > 0 ? "after" : "before";
                    destinationNode = that.dropHint.closest(NODE);
                } else if (that.dropTarget) {
                    destinationNode = that.dropTarget.closest(NODE);
                }

                isValid = that._hintStatus() != "t-denied";

                isDropPrevented = treeview.trigger(DROP, {
                    sourceNode: sourceNode[0],
                    destinationNode: destinationNode[0],
                    isValid: isValid,
                    dropTarget: e.target,
                    dropPosition: dropPosition
                });

                that.dropHint.remove();

                if (!isValid) {
                    return false;
                }

                if (isDropPrevented) {
                    that._draggable.dropped = true;
                    return !isDropPrevented;
                }

                // dragging item within itself
                if ($.contains(sourceNode[0], e.target)) {
                    return false;
                }

                that._draggable.dropped = true;

                // perform reorder / move
                if (dropPosition == "over") {
                    treeview.append(sourceNode, destinationNode);
                    treeview.expand(destinationNode);
                } else if (dropPosition == "before") {
                    treeview.insertBefore(sourceNode, destinationNode);
                } else if (dropPosition == "after") {
                    treeview.insertAfter(sourceNode, destinationNode);
                }

                treeview.trigger(DRAGEND, {
                    sourceNode: sourceNode[0],
                    destinationNode: destinationNode[0],
                    dropPosition: dropPosition
                });

                return false;
            }
        }
    };

    // client-side rendering

    extend(TreeView, {
        renderItem: function (options) {
            options = extend({ treeview: {}, group: {} }, options);

            var templates = TreeView.templates,
                empty = templates.empty,
                item = options.item,
                treeview = options.treeview;

            return templates.item(extend(options, {
                image: item.imageUrl ? templates.image : empty,
                sprite: item.spriteCssClass ? templates.sprite : empty,
                itemWrapper: templates.itemWrapper,
                toggleButton: item.items ? templates.toggleButton : empty,
                subGroup: TreeView.renderGroup
            }, TreeView.rendering));
        },

        renderGroup: function (options) {
            return TreeView.templates.group(extend({
                renderItems: function(options) {
                    var html = "",
                        i = 0,
                        items = options.items,
                        len = items ? items.length : 0,
                        group = extend({ length: len }, options.group);

                    for (; i < len; i++) {
                        html += TreeView.renderItem(extend(options, {
                            group: group,
                            item: extend({ index: i }, items[i])
                        }));
                    }

                    return html;
                }
            }, options, TreeView.rendering));
        }
    });

    TreeView.rendering = {
        wrapperCssClass: function (group, item) {
            var result = "t-item",
                index = item.index;

            if (group.firstLevel && index == 0) {
                result += " t-first"
            }

            if (index == group.length-1) {
                result += " t-last";
            }

            return result;
        },
        cssClass: function(group, item) {
            var result = "",
                index = item.index,
                groupLength = group.length - 1;

            if (group.firstLevel && index == 0) {
                result += "t-top ";
            }

            if (index == 0 && index != groupLength) {
                result += "t-top";
            } else if (index == groupLength) {
                result += "t-bot";
            } else {
                result += "t-mid";
            }

            return result;
        },
        textClass: function(item) {
            var result = "t-in";

            if (item.enabled === false) {
                result += " t-state-disabled";
            }

            if (item.selected === true) {
                result += " t-state-selected";
            }

            return result;
        },
        textAttributes: function(item) {
            return item.url ? " href='" + item.url + "'" : "";
        },
        toggleButtonClass: function(item) {
            var result = "t-icon";

            if (item.expanded !== true) {
                result += " t-plus";
            } else {
                result += " t-minus";
            }

            if (item.enabled === false) {
                result += "-disabled";
            }

            return result;
        },
        text: function(item) {
            return item.encoded === false ? item.text : kendo.htmlEncode(item.text);
        },
        tag: function(item) {
            return item.url ? "a" : "span";
        },
        groupAttributes: function(group) {
            return group.expanded !== true ? " style='display:none'" : "";
        },
        groupCssClass: function(group) {
            var cssClass = "t-group";

            if (group.firstLevel) {
                cssClass += " t-treeview-lines";
            }

            return cssClass;
        }
    };

    TreeView.templates = {
        group: template(
            "<ul class='<#= groupCssClass(group) #>'<#= groupAttributes(group) #>>" +
                "<#= renderItems(data); #>" +
            "</ul>"
        ),
        itemWrapper: template(
            "<div class='<#= cssClass(group, item) #>'>" +
                "<#= toggleButton(data) #>" +
                "<<#= tag(item) #> class='<#= textClass(item) #>'<#= textAttributes(item) #>>" +
                    "<#= image(item) #><#= sprite(item) #><#= text(item) #>" +
                "</<#= tag(item) #>>" +
            "</div>"
        ),
        item: template(
            "<li class='<#= wrapperCssClass(group, item) #>'>" +
                "<#= itemWrapper(data) #>" +
                "<# if (item.items) { #>" +
                "<#= subGroup({ items: item.items, treeview: treeview, group: { expanded: item.expanded } }) #>" +
                "<# } #>" +
            "</li>"
        ),
        image: template("<img class='t-image' alt='' src='<#= imageUrl #>' />"),
        toggleButton: template("<span class='<#= toggleButtonClass(item) #>'></span>"),
        sprite: template("<span class='t-sprite <#= spriteCssClass #>'></span>"),
        empty: template("")
    };

    ui.plugin("TreeView", TreeView);

})(jQuery);

