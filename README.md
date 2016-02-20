# barista-fiddle

Provides a GUI to interact with Barista, built in native-web technologies.
<center>
![Fiddle Screenshot](https://raw.githubusercontent.com/baristalabs/barista-fiddle/master/fiddlescreenshot.png "Fiddle")

</center>

To use as middleware:

```
var express = require("express");
var baristaFiddle = require("barista-fiddle");

var app = express();
app.use("/fiddle", baristaFiddle);
...
```
