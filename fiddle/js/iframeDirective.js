ngColdBrew.directive("ncbIframe", ['$coldBrew', function ($coldBrew) {
        return {
            restrict: "A",
            scope: {
                value: "=?bfValue",
                data: "=?bfData",
                callback: "&bfOnload"
            },
            controller: ['$scope', function ($scope) {
                
                }],
            link: function (scope, element, attrs) {
                scope.hasLoaded = false;
                
                // hooking up the onload event - calling the callback on load event
                element.on("load", function () { scope.hasLoaded = true; scope.callback() });
                
                var updateResultsIframeIE = function (value, contentType) {
                    var iframe = element[0].contentWindow || element[0].contentDocument;
                    iframe.document.open(contentType, "replace");
                    iframe.document.write(btoa(String.fromCharCode.apply(null, new Uint8Array(value.rawData))));
                    iframe.document.close();
                };
                
                scope.renderResults = function (value) {
                    
                    if (angular.isDefined(value)) {
                        if (angular.isFunction(value))
                            element.contents().find('html').html(value());
                        else if (angular.isObject(value) || angular.isArray(value))
                            if (value.toString() === "[object ArrayBuffer]")
                                element.contents().find('body').html(String.fromCharCode.apply(null, new Uint8Array(value)));
                            else
                                element.contents().find('body').html(JSON.stringify(value, null, 4));
                        else
                            element.contents().find('html').html(value);
                    }
                };
                
                if (scope.value) {
                    scope.$watch('value', function (value) {
                        scope.renderResults(value.rawData);
                    });
                }
                
                if (scope.data) {
                    scope.$watch('data', function (value) {
                        var contentType = "application/octet-stream";
                        if (value.contentType)
                            contentType = value.contentType;
                        
                        if ($coldBrew.getInternetExplorerVersion() > -1) {
                            updateResultsIframeIE(value, contentType);
                        }
                        
                        var dataUri = "data:" + contentType + ";base64," + btoa(String.fromCharCode.apply(null, new Uint8Array(value.rawData)));
                        
                        //if we recognize the content type as text, pdf or image, just display it.
                        if (contentType.indexOf("text/") === 0 ||
                        contentType.indexOf("image/") === 0 ||
                        contentType == "application/pdf") {
                            element[0].src = dataUri;
                        }
                    //everything else gets defined as a downloadable item.
                        else {
                            var doc = element[0].contentDocument;
                            var a = doc.createElement('a');
                            if (value.fileName)
                                a.download = value.fileName;
                            a.href = dataUri;
                            a.textContent = "Click to download ";
                            doc.body.innerHTML = "";
                            doc.body.appendChild(a);
                        }
                    });
                }
                
                scope.$watch('hasLoaded', function (value) {
                    if (value === true)
                        scope.renderResults(scope.result);
                });
            }
        }
    }]);