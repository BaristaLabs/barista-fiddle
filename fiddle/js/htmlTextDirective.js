ngColdBrew.directive("ncbHtmlText", ['$timeout', function ($timeout) {
        return {
            restrict: "EA",
            replace: true,
            scope: {
                html: "=html",
                indent: "=?"
            },
            controller: ['$scope', function ($scope) {
                $scope.htmlOptions = {
                    lineWrapping: false,
                    lineNumbers: true,
                    mode: { name: "text/html" },
                    theme: "neat",
                    indentUnit: 4,
                    foldGutter: true,
                    scrollbarStyle: "overlay",
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                    highlightSelectionMatches: { showToken: /\w/ },
                    styleActiveLine: true,
                    readOnly: true,
                    onLoad: function (cm) {
                        $scope.__resultsEditor = cm;

                        $timeout(function () {
                            cm.refresh();
                            cm.setSize(null, "100%");
                        });
                    }
                };
            }],
            link: function (scope, element, attrs) {
                //scope.formattedJson = "";
                
                //scope.$watch('json', function (value) {
                //    scope.formattedJson = JSON.stringify(value, null, scope.indent ? scope.indent : 4);
                //});
            },
            template: "<div data-ui-codemirror='htmlOptions' data-ng-model='html' data-ui-refresh='$parent.$parent.tabs[1].active'></div>"
        }
    }]);