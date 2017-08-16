### Freedo GBIM360 API说明文件

## 结构介绍
本套API，以FdApp作为入口创建FdProject。FdProject中有FdSceneManager、FdLabelPointsManager等管理器来设置三维显示效果。

## 引用文件

需要引用Freedo.js和FrerdoX.js，并且同时引用其依赖的widget.css和lodash.min.js文件。
FreedoX.js 代码的链接是 http://gbim360.com:9999/projects/FreedoGBIM360/[FDVERSION]/API/FreedoX.js。（注：请将FDVERSION换成对应的版本号。下同。）
注意示例代码中的引用示例如下：
```
    <link href="http://gbim360.com:9999/projects/FreedoGBIM360/1.0.0-alpha.170626/FreeDo/Widgets/widgets.css" rel="stylesheet">
    <script src="http://gbim360.com:9999/projects/FreedoGBIM360/1.0.0-alpha.170626/FreeDo/FreeDo.js"></script>
    <script src="https://cdn.bootcss.com/lodash.js/4.17.4/lodash.min.js"></script>
    <script src="../../dist/GBIM360/API/FreedoX.js"></script>
```
我们需要修改一下FreedoX.js的引用路径，改成如下形式：
```
    <link href="http://gbim360.com:9999/projects/FreedoGBIM360/1.0.0-alpha.170626/FreeDo/Widgets/widgets.css" rel="stylesheet">
    <script src="http://gbim360.com:9999/projects/FreedoGBIM360/1.0.0-alpha.170626/FreeDo/FreeDo.js"></script>
    <script src="https://cdn.bootcss.com/lodash.js/4.17.4/lodash.min.js"></script>
    <script src="http://gbim360.com:9999/projects/FreedoGBIM360/[FDVERSION]/API/FreedoX.js"></script>
```

## 主要源码
为了显示三维画面，需要首先在body元素中创建一个div，并在创建工程时传入该div元素。示例代码如下：
```
<body>
    <div class="main">
        <div id="freedoContainer" style="height: 100%;"></div>
    </div>
    <script>
        var container = document.getElementById("freedoContainer");
        var project = Freedo.FdApp.createProject(container);
    </script>
</body>
```

## 其他链接
[示例程序](http://gbim360.com:9999/projects/FreedoGBIM360/[FDVERSION]/Examples)
[场景查看器](http://gbim360.com:9999/projects/FreedoGBIM360/[FDVERSION]/Viewer)
[在线文档](http://gbim360.com:9999/projects/FreedoGBIM360/[FDVERSION]/Documentation)