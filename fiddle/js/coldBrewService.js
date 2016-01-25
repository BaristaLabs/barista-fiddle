ngColdBrew.service('$coldBrew', ['$window', '$document', function ($window, $document) {
        
        var getInternetExplorerVersion = function () {
            if ($window.navigator.platform != "Win32")
                return false;
            
            var ua, re, rv = -1; // Return value assumes failure.
            if (navigator.appName == 'Microsoft Internet Explorer') {
                ua = navigator.userAgent;
                re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null)
                    rv = parseFloat(RegExp.$1);
            }
            else if (navigator.appName == 'Netscape') {
                ua = navigator.userAgent;
                re = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null)
                    rv = parseFloat(RegExp.$1);
            }
            
            return rv;
        };
        
        return {
            getInternetExplorerVersion : getInternetExplorerVersion
        }
    }]);