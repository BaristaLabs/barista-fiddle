ngColdBrew.controller('tabCtrl', ['$scope', '$http', '$timeout',
    function ($scope, $http, $timeout) {
        $scope.model = {
            errorCount: 0
        };

        $scope.editorOptions = {
            lineWrapping: true,
            lineNumbers: $scope.tab.settings.wordWrap ? $scope.tab.settings.wordWrap : true,
            mode: { name: "javascript", json: false },
            theme: "neat",
            indentUnit: 4,
            foldGutter: true,
            scrollbarStyle: "overlay",
            gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            lint: {
                options: {
                    strict: "implied",
                    esversion: 6,
                    expr: true,
                    globals: {
                        "require": false,
                        "console": false
                    }
                }
            },
            highlightSelectionMatches: { showToken: /\w/ },
            styleActiveLine: true,
            onLoad: function (cm) {
                $scope.tab.__editor = cm;

                //Initialize tern
                //TODO: Change this to pull in the current barista state. somehow.
                $http({
                    cache: true,
                    method: "GET",
                    url: "http://ternjs.net/defs/ecma5.json"

                })
                .success(function (code) {
                    $scope.tab.__tern = new CodeMirror.TernServer({
                        defs: [code]
                    });
                    
                    cm.on("cursorActivity", function (cm) {
                        $scope.tab.__tern.updateArgHints(cm);
                    });

                    //Force an auto-complete after "."
                    cm.on('keyup', function (cm, e) {
                        
                        if (e.keyCode === 190) {
                            $scope.tab.__tern.complete(cm);
                            return;
                        }
                        
                        var cursorPos = cm.getCursor();
                        var line = cm.getLine(cursorPos.line);
                        
                        if (line.match(/^.*require\(['|"]$/i))
                            $scope.tab.__tern.complete(cm);
                    });
                });
                
                
                $timeout(function () {
                    cm.refresh();
                    cm.setSize(null, "100%");
                });
            },
            "extraKeys": {
                "Ctrl-Enter": function (cm) {
                    $scope.evaluateScript($scope.tab);
                },
                "Ctrl-Shift-Enter": function (cm) {
                    //$scope.debugScript();
                },
                "Ctrl-Space": function (cm) {
                    $scope.tab.__tern.complete(cm);
                },
                "Shift-Ctrl-C": function (cm) {
                    if (!cm.somethingSelected())
                        return;

                    var selection = cm.listSelections()[0];
                    cm.toggleComment(selection.head, selection.anchor, { blockCommentStart: "/*", blockCommentEnd: "*/", lineComment: "//" });
                },
                "Ctrl-/": function (cm) {
                    if (!cm.somethingSelected())
                        return;

                    var selection = cm.listSelections()[0];
                    if (selection.head.line !== selection.anchor.line)
                        cm.blockComment(selection.head, selection.anchor, { blockCommentStart: "/*", blockCommentEnd: "*/" });
                    else
                        cm.lineComment(selection.head, selection.anchor, { lineComment: "//" });
                },
                "Shift-Ctrl-/": function (cm) {
                    if (!cm.somethingSelected())
                        return;
                    
                    var selection = cm.listSelections()[0];
                    cm.uncomment(selection.head, selection.anchor, { blockCommentStart: "/*", blockCommentEnd: "*/" });
                },
                "Ctrl-K Ctrl-D": function (cm) {
                    $scope.tidyUp($scope.tab);
                },
                "Ctrl-I": function (cm) {
                    $scope.tab.__tern.showType(cm);
                },
                "Ctrl-O": function (cm) {
                    $scope.tab.__tern.showDocs(cm);
                },
                "Alt-.": function (cm) {
                    $scope.tab.__tern.jumpToDef(cm);
                },
                "Alt-,": function (cm) {
                    $scope.tab.__tern.jumpBack(cm);
                },
                "Ctrl-Q": function (cm) {
                    $scope.tab.__tern.rename(cm);
                },
                "Ctrl-.": function (cm) {
                    $scope.tab.__tern.selectName(cm);
                }
            }
        };
        
        $scope.getActiveResultTabContentHeight = function () {
            return ($('#fiddleTabs .tab-pane.active #resultsPane').height() - $('#fiddleTabs .tab-pane.active #resultsPane ul.nav.nav-tabs').height()) + "px";
        };

        $scope.getActiveTabConsolePaneHeight = function () {

            if ($('#fiddleTabs .tab-pane.active #codePane').length === 0)
                return 0;

            return ($('#fiddleTabs div.tab-content').height() - $('#fiddleTabs .tab-pane.active #codePane').height());
        };

        $scope.determineIfConsoleIsShowing = function (newValue, oldValue) {
            if($scope.getActiveTabConsolePaneHeight() > 0)
                $scope.tab.__isShowingConsole = true;
            else
                $scope.tab.__isShowingConsole = false;
        };

        $scope.refresh = function () {
            $scope.tab.__editor.refresh();
            if ($scope.tab.__resultsEditor)
                $scope.tab.__resultsEditor.refresh();
        };
        
        //Watch for wordwrap changes.
        $scope.$watch("tab.settings.wordWrap", function (value) {
            if ($scope.tab.__editor)
                $scope.tab.__editor.setOption("lineWrapping", value);
        });

        //While resizing, stop processing pointer events on the iframe
        //This stops apparent jank when the cursor drags over the iframe and stops the drag operation.
        $scope.$on("angular-resizable.resizeStart", function (event, args) {
            $("iframe").each(function (ix, element) {
                $(element).css("pointer-events", "none");
            });
        });

        //Watch for resizable panel changes.
        $scope.$on("angular-resizable.resizeEnd", function (event, args) {

            if (args.id === "codePane") {
                _.set($scope.tab, "size.height", args.height);
            }
            else if (args.id === "editorPane") {
                _.set($scope.tab, "size.width", args.width);
            }
            else {
                console.log("huh.." + args.id);
            }

            //Re-enable pointer events on iframes
            $("iframe").each(function (ix, element) {
                $(element).css("pointer-events", "auto");
            });

            $scope.determineIfConsoleIsShowing();

            $timeout(function () {
                $scope.refresh();
            });
        });

        //If the window size changes, re-determine if the console is showing.
        $scope.$watch("windowHeight", function (newValue, oldValue) {
            $scope.determineIfConsoleIsShowing(newValue, oldValue);
        });

        $scope.$on("toggle-tab-console", function (e, activeTab) {
            if ($scope.tab !== activeTab)
                return;

            if (!$scope.tab.__isShowingConsole)
                $scope.tab.size.height = $('#fiddleTabs div.tab-content').height() - 150;
            else
                $scope.tab.size.height = $('#fiddleTabs div.tab-content').height();

            $timeout(function () {
                $scope.refresh();
                $scope.determineIfConsoleIsShowing();
            });
        });

        $scope.$on("BaristaEditor-Errors", function (e, count) {
            $scope.$apply(function () {
                $scope.model.errorCount = count;
            })
        });

        //Determine if the initial position of the console makes it visible.
        $timeout(function () {
            $scope.determineIfConsoleIsShowing();
        });
    }]);
