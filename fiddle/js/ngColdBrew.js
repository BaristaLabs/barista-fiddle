var ngColdBrew = angular.module("ngColdBrew", [
    "ngSanitize",
    "ui.bootstrap",
    "ui.router",
    "ui.codemirror",
    "angularResizable",
    "pageslide-directive",
    "LocalStorageModule",
    "focusOn",
    "jsonFormatter"]);

ngColdBrew.config(["localStorageServiceProvider", function (localStorageServiceProvider) {
        localStorageServiceProvider.setPrefix("coldBrew");
    }]);

ngColdBrew.config(['JSONFormatterConfigProvider', function (JSONFormatterConfigProvider) {
        
        // Enable the hover preview feature
        JSONFormatterConfigProvider.hoverPreviewEnabled = true;
    }]);

ngColdBrew.factory("baristaEndpointUrlPrefix", ["$window", function ($window) {
    return function() {
        if (angular.isDefined($window.__baristaServerUrl))
            return $window.__baristaServerUrl;
        return "..";
    };
    }]);

ngColdBrew.service("fiddleTabDefaults", function () {
    return {
        code: "var helloWorld = function() {\n\
    return (\"Hello, World!\");\n\
};\n\
\n\
helloWorld();"
    };
});

ngColdBrew.controller('MainCtrl', ['$scope', '$http', '$timeout', '$uibModal', '$sce', 'localStorageService', 'focus', '$coldBrew', 'fiddleTabDefaults', 'baristaEndpointUrlPrefix',
    function ($scope, $http, $timeout, $uibModal, $sce, localStorageService, focus, $coldBrew, fiddleTabDefaults, baristaEndpointUrlPrefix) {

        $scope.model = {
            tabs: null
        };

        $scope.initTabs = function () {
            $scope.model.tabs = [
                {
                    title: "Tab 1",
                    size: {
                        height: $scope.getTabContentHeight(),
                        width: null
                    },
                    active: true,
                    result: null,
                    code: fiddleTabDefaults.code,
                    settings: {
                        wordWrap: true
                    },
                    active: true,
                    consoleIsLoading: false,
                    consoleData: []
                }
            ];
        };
        
        $scope.addTab = function () {
            if (angular.isArray($scope.model.tabs) === false) {
                $scope.initTabs();
                return;
            }
            
            var count = 0;
            angular.forEach($scope.model.tabs, function (t) {
                var tabTitleRegExp = new RegExp("^Tab (\\d+)$", "i");
                if (tabTitleRegExp.test(t.title))
                    count = parseInt(tabTitleRegExp.exec(t.title)[1]);
            });
            
            $scope.model.tabs.push({
                title: "Tab " + (count + 1),
                size: {
                    height: $scope.getTabContentHeight(),
                    width: null
                },
                code: fiddleTabDefaults.code,
                settings: {
                    wordWrap: true
                },
                active: true,
                consoleIsLoading: false,
                consoleData: []
            });
            
            $scope.saveTabs();
        };
        
        $scope.getActiveTab = function () {
            return _.find($scope.model.tabs, { active: true });
        };
        
        $scope.closeTab = function () {
            if (angular.isArray($scope.model.tabs) === false) {
                $scope.initTabs();
                return undefined;
            }
            var activeTab = $scope.getActiveTab();
            activeTab.active = false;

            $timeout(function () {

                var nextActiveTab = $scope.model.tabs[_.indexOf($scope.model.tabs, activeTab) - 1];
                if (!nextActiveTab)
                    nextActiveTab = _.find($scope.model.tabs, function (tab) {
                        return tab != activeTab;
                    });

                if (nextActiveTab)
                    nextActiveTab.active = true;

                _.pull($scope.model.tabs, activeTab);
                
                $scope.saveTabs();
            });
        };
        
        $scope.saveTabs = function () {
            var allTabsState = [];
            
            angular.forEach($scope.model.tabs, function (tab) {
                //property values that are prefixed with '_' won't be saved.
                var currentTabState = _.pickBy(tab, function (value, key) {
                    return key.charAt(0) !== "_";
                });
                
                //Make a copy of the state so we don't mutate the original tab state.
                var currentTabStateCopy = angular.copy(currentTabState);
                
                //convert ArrayBuffer values to strings.
                if (currentTabState.result && currentTabState.result.rawData) {
                    var decoder = new TextDecoder();
                    currentTabStateCopy.result.rawData = decoder.decode(currentTabState.result.rawData);
                }

                allTabsState.push(currentTabStateCopy);
            });
                        
            localStorageService.set("tabs", allTabsState);
        };
        
        $scope.loadTabs = function () {
            $scope.model.tabs = localStorageService.get("tabs");
        };
        
        $scope.evaluateScript = function (activeTab, setFocus) {
            
            if (!activeTab)
                activeTab = $scope.getActiveTab();
            
            if (!setFocus)
                setFocus = false;
            
            activeTab.isEvaluatingScript = true;

            var headers = {};

            if (!_.isNaN(_.parseInt(activeTab.settings.executionTimeout)))
                headers["X-Barista-Execution-Timeout"] = _.parseInt(activeTab.settings.executionTimeout);
            else
                headers["X-Barista-Execution-Timeout"] = 5 * 1000; // 5 seconds
            
            return $http({
                method: "POST",
                url: baristaEndpointUrlPrefix() + "/api/eval",
                headers: headers,
                data: {
                    code: activeTab.code
                },
                responseType: "arraybuffer"
            }).then(
                function (response) {
                    $scope.processResult(response, activeTab);

                    var resultHeaders = response.headers();
                    var correlationId = resultHeaders["x-barista-correlationid"];
                    if (correlationId && $scope.isActiveTabShowingConsole())
                        return $scope.getConsoleMessages(correlationId, activeTab);
                },
                function (response) {
                    $scope.processResult(response, activeTab);

                    var resultHeaders = response.headers();
                    var correlationId = resultHeaders["x-barista-correlationid"];
                    if (correlationId && $scope.isActiveTabShowingConsole())
                        return $scope.getConsoleMessages(correlationId, activeTab);
                })["finally"](function () {
                    activeTab.isEvaluatingScript = false;
                    $scope.saveTabs();

                    if (setFocus == true)
                        focus("resultUpdated");
                });
        };
        
        $scope.processResult = function (ajaxResult, activeTab) {
            
            if (!activeTab)
                activeTab = $scope.getActiveTab();
            
            var resultHeaders = ajaxResult.headers();
            var contentType = resultHeaders["content-type"];
            var contentDisposition = resultHeaders["content-disposition"];
            
            var resultObj = {
                format: "unknown",
                contentType: contentType,
                //Raw data is a byteArray
                rawData: ajaxResult.data,
                data: null
            };
            
            if (resultObj.rawData && resultObj.rawData.byteLength > 0) {
                var decoder = new TextDecoder();

                //Based on the content type, set a flag that indicates which results view directive to use.
                if (angular.isString(contentType) && contentType.length > 0) {
                    if (contentType.indexOf("application/json") === 0) {
                        resultObj.format = "json";
                        resultObj.data = JSON.parse(decoder.decode(resultObj.rawData));
                    }
                    else if (contentType.indexOf("text/html") === 0) {
                        resultObj.format = "html";
                        resultObj.data = decoder.decode(resultObj.rawData);
                        resultObj.data = html_beautify(resultObj.data);
                    }
                    else if (contentType.indexOf("text/") === 0) {
                        resultObj.format = "html";
                        resultObj.data = decoder.decode(resultObj.rawData);
                    }
                    else if (contentType.indexOf("application/") === 0 ||
                        contentType.indexOf("image/") === 0) {
                        
                        //Determine the filename from the content-disposition header, if defined.
                        if (contentDisposition) {
                            contentDisposition = contentDisposition.split(";");
                            angular.forEach(contentDisposition, function (cd) {
                                if (cd.trim().indexOf("filename=\"") === 0)
                                    resultObj.fileName = cd.substring(11, cd.length - 1);
                            });
                        }
                        resultObj.format = "data";
                    }
                }
            }
            else {
                resultObj.format = "empty";
            }
            activeTab.result = resultObj;
        };

        $scope.getConsoleMessages = function (correlationId, activeTab)
        {
            if (!correlationId)
                return;

            if (!activeTab)
                activeTab = $scope.getActiveTab();
            
            activeTab.consoleIsLoading = true;
            return $http({
                method: "GET",
                url: baristaEndpointUrlPrefix() + "/api/consoleMessages/" + correlationId
            }).then(
                function (response) {
                    activeTab.consoleData = response.data;
                    activeTab.consoleIsLoading = false;
                }
            );
        };
        
        $scope.tidyUp = function (tab) {
            if (!tab)
                tab = $scope.getActiveTab();
            
            tab.code = js_beautify(tab.code);
        };
        
        $scope.tabSelected = function (tab, index) {
            $scope.$broadcast("Tab-Selected", tab);
        };
        
        $scope.tabDeselected = function (tab) {
            $scope.$broadcast("Tab-Deselected", tab);
        };
        
        $scope.showKeyboardShortcutsDialog = function() {
            var modalInstance = $uibModal.open({
                templateUrl: 'views/keyboardShortcutsDialog.html'
            });
        };
        
        $scope.showGlobalSettingsDialog = function () {

            var modalInstance = $uibModal.open({
                templateUrl: 'views/globalSettingsDialog.html'
            });

        };

        $scope.isActiveTabShowingConsole = function (activeTab) {
            if (!activeTab)
                activeTab = $scope.getActiveTab();

            if (!activeTab)
                return;

            return activeTab.__isShowingConsole;
        }

        $scope.toggleTabConsole = function (activeTab) {

            if (!activeTab)
                activeTab = $scope.getActiveTab();

            $scope.$broadcast("toggle-tab-console", activeTab);
        };
        
        $scope.showTabSettingsDialog = function (tab) {
            if (!tab)
                return;

            var modalInstance = $uibModal.open({
                templateUrl: 'views/tabSettingsDialog.html',
                controller: ['$scope', 'tab', function (tabSettingsScope, tab) {
                        tabSettingsScope.tab = tab;
                    }],
                resolve: {
                    tab: function () {
                        return {
                            title: tab.title,
                            settings: angular.copy(tab.settings)
                        };
                    }
                }
            }).result.then(function (tabResult) {
                
                tab.title = tabResult.title;
                tab.settings = tabResult.settings;

                $scope.saveTabs();
            })
        };

        $scope.getFiddleContentHeight = function () {
            return $scope.windowHeight - $('#fiddle-topnav').height();
        };

        $scope.getTabContentHeight = function () {
            return $scope.getFiddleContentHeight() - $('ul.nav.nav-tabs').height() - 8;
        };

        //Initialization
        $scope.loadTabs();
        
        if (angular.isArray($scope.model.tabs) === false) {
            $scope.initTabs();
        }
    }]);
