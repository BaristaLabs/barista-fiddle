# barista-fiddle

"It's like LinqPad for microservices that you can build in Production!"

Provides a native-web IDE to interact with Barista with autocomplete, fancy output display and more!

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
