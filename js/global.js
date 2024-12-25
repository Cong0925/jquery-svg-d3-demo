let globalObj = {
    currentNodeId: '', // 当前正在设置的节点
    svgWidth: '10000', // svg 画布大小
    svgHeight: '10000', // svg 画布大小
    svgData: {},
    forceUpdateCount: 0, // 记录force更新次数，用于降低更新频率
    forceUpdateSpace: 5, // 记录force更新间隔，用于降低更新频率 
    isInitForce: true, // 是否初次 加载力图，
    gridSpacing: 100, // 背景网格线之间的间隔 
    adsorptionThreshold: 5, // 节点吸附网格坐标的阈值
}
/**
 * @description: 整个界面去除浏览器自带右键菜单
 */
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});


/**
 * @description: 页面内容准备好后
 */
$(document).ready(function () {
    // 调用 bugs提示面板 拖拽移动功能
    enableDrag();

    let nodesMap = {}
    let linesMap = {}

    // 记录是否 按下 ctrl
    let ctrl_key = false

    /**
     * @description: 用于记录画布移动相关的数据对象，包含了画布移动过程中多个维度的状态信息。
     * @property {boolean} isDragging 用于记录当前是否正在进行拖拽操作，取值为 `true` 表示正在拖拽画布，取值为 `false` 表示当前未处于拖拽状态，常用于判断是否触发与画布拖拽相关的逻辑。
     * @property {null | number} startX 记录画布开始移动时（例如鼠标按下准备进行拖拽操作那一刻）在 `X` 轴方向的起始坐标位置，初始值设为 `null`，在相应操作启动（如鼠标按下且满足拖拽条件时）会被赋予实际的坐标数值，方便后续计算画布移动的偏移量等操作。
     * @property {null | number} startY 记录画布开始移动时（例如鼠标按下准备进行拖拽操作那一刻）在 `Y` 轴方向的起始坐标位置，初始值设为 `null`，在相应操作启动（如鼠标按下且满足拖拽条件时）会被赋予实际的坐标数值，方便后续计算画布移动的偏移量等操作。
     * @property {number} svgTranslateX 用于累计记录 SVG 元素在 `X` 轴方向的总偏移量，随着画布的移动操作（比如通过鼠标拖拽等方式），该数值会相应地动态更新，以精确反映 SVG 在水平方向上相对于初始位置的位置变化情况，常用于在后续的绘制或者交互逻辑中确定 SVG 的准确位置。
     * @property {number} svgTranslateY 用于累计记录 SVG 元素在 `Y` 轴方向的总偏移量，随着画布的移动操作（比如通过鼠标拖拽等方式），该数值会相应地动态更新，以精确反映 SVG 在垂直方向上相对于初始位置的位置变化情况，常用于在后续的绘制或者交互逻辑中确定 SVG 的准确位置。
     */
    let svgDrawingObj = {
        isDragging: false, // 记录是否正在拖拽
        startX: null, // 记录起始位置
        startY: null, // 记录起始位置
        svgTranslateX: 0, // 记录SVG在X轴方向的总偏移量
        svgTranslateY: 0, // 记录SVG在Y轴方向的总偏移量
    };
    /**
     * @description: 画布移动限制，用于定义画布移动限制相关的数据对象，规定了 SVG 画布在平面坐标系中可移动的边界范围。
     * @property {number} left 表示画布在水平方向（X 轴）上的左边界限制值，即画布不能再往右移动超过此值，单位通常与 SVG 坐标系一致，初始值设为 0，意味着最开始画布右侧没有向左的移动限制（可按需调整）。
     * @property {number} top 表示画布在垂直方向（Y 轴）上的上边界限制值，即画布不能再往下移动超过此值，单位通常与 SVG 坐标系一致，初始值设为 0，意味着最开始画布下方没有向上的移动限制（可按需调整）。
     * @property {number} right 规定了 SVG 画布在水平方向（X 轴）上向左移动的最大范围，其值通过计算 `-(globalObj.svgWidth-$('#svgArea').width())` 得到，是一个负数，反映了 SVG 相对于外部容器（如 `#svgArea`）宽度差异所决定的最大可向左偏移量。
     * @property {number} bottom 规定了 SVG 画布在垂直方向（Y 轴）上向下移动的最大范围，其值通过计算 `-(globalObj.svgHeight-$('#svgArea').height())` 得到，是一个负数，反映了 SVG 相对于外部容器（如 `#svgArea`）高度差异所决定的最大可向下偏移量。
     */
    let svgTranslateAreaRange = { //svg可移动范围
        left: 0, // 上边界 不能再往右
        top: 0, // 左边界，不能再往下
        right: -(globalObj.svgWidth - $('#svgArea').width()), // svg向左移动，所以移动的最大范围是负数
        bottom: -(globalObj.svgHeight - $('#svgArea').height()) // svg向下移动，所以移动的最大范围是负数
    };

    /**
     * @description: 节点移动的距离，用于记录节点移动过程中在水平（X 轴）和垂直（Y 轴）方向上产生的位移差值的数据对象，方便后续基于位移进行相关计算或逻辑处理。
     * @property {number} diffX 记录节点在水平方向（X 轴）上移动产生的位移差值，正值表示节点向右移动了相应距离，负值表示节点向左移动了相应距离，初始值设为 0，随着节点的拖动操作会实时更新该值。
     * @property {number} diffY 记录节点在垂直方向（Y 轴）上移动产生的位移差值，正值表示节点向上移动了相应距离，负值表示节点向下移动了相应距离，初始值设为 0，随着节点的拖动操作会实时更新该值。
     */
    let nodeDragObj = {
        diffX: 0,
        diffY: 0,
    };

    /**
     * @description: 左键框选相关参数
     */
    let selecteAreaObj = {
        isMove: false,  // 记录是否正在拖拽
        startX: 0,  // 开始时的 x
        startY: 0,  // 开始时的 y
        endX: 0,  // 结束时 x
        endY: 0,  // 结束时 y
        diffX: 0,  // 移动过程的 偏移 x
        diffY: 0,  // 移动过程的 偏移 y
    }

    /**
     * @description: 节点拖拽器
     */
    let drag = d3.drag()
        .subject(function (d) {
            return d;
        })
        .on("start", function (d) {
            console.log("拖动开始", event, d);

            // 给元素添加 选中样式
            // console.log(d3.select(this));
            let node = d3.select(this)
            if (!node.attr('class').includes('node_slt') && !ctrl_key) {
                // 去除其余的选中效果
                $('g.node_slt').removeClass('node_slt')
            }
            $(this).addClass('node_slt')
            nodeClick(this)

            let classStr = d3.select(this).attr('class')
            d3.select(this).attr('class', classStr + ' grabbing-hover')

            // 坐标辅助线 显示
            linePX.classed('hide', false)
            linePY.classed('hide', false)

        })
        .on("drag", function (d) {
            // console.log("正在拖动", d, ctrl_key,force.nodes());
            // console.log(d3.event.x,parseInt(d3.select(this).select('.svg_node').attr('tempx')));

            // 节点拖拽过程碰撞边界
            let dx = d3.event.x < 30 ? 30 : d3.event.x > globalObj.width ? (parseInt(globalObj.width) - 30) : d3.event.x
            let dy = d3.event.y < 30 ? 30 : d3.event.y > globalObj.height ? (parseInt(globalObj.height) - 30) : d3.event.y

            
            let oldTempX = parseInt(d3.select(this).select('.svg_node').attr('tempx')) // 当前正在拖拽的那个节点的初始位置
            let oldTempY = parseInt(d3.select(this).select('.svg_node').attr('tempy')) // 当前正在拖拽的那个节点的初始位置

            let diffX = dx - oldTempX // d3的坐标 相对于当前正在拖拽的节点坐标的偏移
            let diffY = dy - oldTempY // d3的坐标 相对于当前正在拖拽的节点坐标的偏移

            // 吸附节点对象
            let point;
            let theCX, theCY, pointX, pointY
            // 处理主动拖拽节点位置 
            switch (d.type) {
                case 'circle':// 圆形
                    // 坐标线位置变更
                    linePX.attr('d', `M0,${dy} L${d3.select('#mySvg').attr('width')},${dy}`)
                    linePY.attr('d', `M${dx},0 L${dx},${d3.select('#mySvg').attr('height')}`)

                    // 处理当前节点吸附坐标
                    point = pointAdsorption(d.id, { x: dx, y: dy })

                    // 当前节点位置
                    d3.select(this).select('.svg_node').attr('cx', point.x).attr('cy', point.y)
                    // 更新力导向图中节点的固定位置属性
                    d.fx = point.x;
                    d.fy = point.y;
                    d.x = point.x
                    d.y = point.y
                    d.cx = point.x
                    d.cy = point.y
                    break;
                case 'rect':// 矩形
                    theCX = dx + parseInt(d3.select(this).select('.svg_node').attr('width')) / 2
                    theCY = dy + parseInt(d3.select(this).select('.svg_node').attr('height')) / 2

                    // 坐标辅助线 位置更改
                    linePX.attr('d', `M0,${theCY} L${d3.select('#mySvg').attr('width')},${theCY}`)
                    linePY.attr('d', `M${theCX},0 L${theCX},${d3.select('#mySvg').attr('height')}`)

                    // 处理当前节点吸附坐标
                    point = pointAdsorption(d.id, { x: theCX, y: theCY })

                    // 坐标吸附最近的网格线交点，因为是矩形其定位点在左上角，需要进行坐标处理，调整到中心吸附到指定位置
                    pointX = point.x - parseInt(d3.select(this).select('.svg_node').attr('width')) / 2
                    pointY = point.y - parseInt(d3.select(this).select('.svg_node').attr('height')) / 2

                    // 当前节点位置
                    d3.select(this).select('.svg_node').attr('x', pointX).attr('y', pointY)
                    // 更新力导向图中节点的固定位置属性
                    d.fx = pointX;
                    d.fy = pointY;
                    d.x = pointX
                    d.y = pointY
                    d.cx = pointX+d.width/2
                    d.cy = pointY+d.height/2

                    break;
                case 'triangle':// 三角形
                case 'polygon':// 多边形
                    // 获取圆心坐标
                    let theCP = {x: dx,y: dy}

                    // 坐标辅助线 位置更改
                    linePX.attr('d', `M0,${theCP.y} L${d3.select('#mySvg').attr('width')},${theCP.y}`)
                    linePY.attr('d', `M${theCP.x},0 L${theCP.x},${d3.select('#mySvg').attr('height')}`)

                    // 处理当前节点吸附坐标
                    point = pointAdsorption(d.id, { x: theCP.x, y: theCP.y })

                    // console.log(point,theCP.x,theCP.y,d.r,d.sides);
                        console.log(d3.select(this).attr('r'),d3.select(this).attr('sides'))
                    // 得到新的 points 
                    let newPoints = getPolygonCoordinates(point.x, point.y,d3.select(this).select('.svg_node').attr('r'),  d3.select(this).select('.svg_node').attr('sides'))

                    // 当前节点位置 以及其它参数修改
                    d3.select(this).select('.svg_node').attr('points', newPoints)
                    .attr('x', point.x)
                    .attr('cx', point.x)
                    .attr('y', point.y)
                    .attr('cy', point.y)

                    // 更新力图上对应的坐标数据
                    d.fx = point.x;
                    d.fy = point.y;
                    d.x = point.x
                    d.y = point.y
                    d.cx = point.x
                    d.cy = point.y
                    break
                default:
                    break;
            }
            // console.log(point.offsetX,point.offsetY);

            // 处理其余选中 被动拖拽的节点位置
            d3.selectAll('.node_slt').each(function (node) {
                // console.log(node,node.id);

                // 根据事件对象中的位置信息更新元素的位置
                let type = d3.select(this).select('.svg_node').attr('el-type')
                oldTempX = parseInt(d3.select(this).select('.svg_node').attr('tempx')) // 当前被选中节点的初始位置
                oldTempY = parseInt(d3.select(this).select('.svg_node').attr('tempy')) // 当前被选中节点的初始位置

                let newTempX = oldTempX + diffX
                let newTempY = oldTempY + diffY
                
                // 判断节点是否超出画布边界
                switch (type) {
                    case 'circle':// 圆形绘制
                        if (d.id != node.id) {
                            // 判断是否触及边界
                if(newTempX -node.r <=0 || newTempY-node.r<=0) return

                // 处理当前节点吸附坐标
                            point = pointAdsorption(node.id, { x: newTempX, y: newTempY })
                            // 不是当前拖拽的那个节点
                            d3.select(this).select('.svg_node').attr('cx', point.x).attr('cy', point.y)
                            // 当前节点对应的 force.nodes上的对象
                            let theNode = getNodeById(node.id)
                            // 更新力图上对应的坐标数据
                            theNode.x = point.x
                            theNode.y = point.y
                            theNode.fx = point.x
                            theNode.fy = point.y
                            theNode.cx = point.x
                            theNode.cy = point.y
                        }
                        break;
                    case 'rect':// 矩形绘制
                        if (d.id != node.id) {
                            // 判断是否触及边界
                if(newTempX -5 <=0 || newTempY-5<=0) return
                // 处理当前节点吸附坐标
                            point = pointAdsorption(node.id, { x: newTempX+node.width/2, y: newTempY+node.height/2 })
                            // 不是当前拖拽的那个节点
                            d3.select(this).select('.svg_node').attr('x', point.x-node.width/2).attr('y', point.y-node.height/2)

                            // 当前节点对应的 force.nodes上的对象
                            // 更新力图上对应的坐标数据
                            let theNode = getNodeById(node.id)
                            theNode.x = point.x-node.width/2
                            theNode.y = point.y-node.height/2
                            theNode.fx = point.x-node.width/2
                            theNode.fy = point.y-node.height/2
                            theNode.cx = point.x
                            theNode.cy = point.y
                        }
                        break;
                    case 'triangle':// 三角形绘制
                    case 'polygon':// 多边形绘制
                        if (d.id != node.id) {
                            // 判断是否触及边界
                if(newTempX -node.r <=0 || newTempY-node.r<=0) return
                // 处理当前节点吸附坐标
                            point = pointAdsorption(node.id, { x: newTempX, y: newTempY })
                            // 不是当前拖拽的那个节点
                            // console.log(oldTempX , diffX, oldTempX , diffX, node.r, node.sides);
                            let newPoints = getPolygonCoordinates(point.x, point.y, d3.select(this).select('.svg_node').attr('r'),  d3.select(this).select('.svg_node').attr('sides'))
                            d3.select(this).select('.svg_node').attr('points', newPoints)
                            .attr('x', point.x)
                            .attr('cx', point.x)
                            .attr('y', point.y)
                            .attr('cy', point.y)
                            // 当前节点对应的 force.nodes上的对象
                            let theNode = getNodeById(node.id)
                            // 更新力图上对应的坐标数据
                            theNode.x = point.x
                            theNode.y = point.y
                            theNode.fx = point.x
                            theNode.fy = point.y
                            theNode.cx = point.x
                            theNode.cy = point.y
                        }
                        break;

                    default:
                        break;
                }
            })

            // 重新启动力导向图模拟
            force.restart();

            // console.log(d3.event.x,d3.event.y);
        })
        .on("end", function (d) {
            // console.log("拖动结束", event, d,);
            // console.log(d3.event.x,d3.event.y);

            d3.selectAll('.node_slt').each(function (node) {
                let theNode = getNodeById(node.id)
                // 根据事件对象中的位置信息更新元素的位置
                d3.select(this).select('.svg_node').attr('tempx', theNode.x) // 当前被选中节点的初始位置
                d3.select(this).select('.svg_node').attr('tempy', theNode.y) // 当前被选中节点的初始位置

                // console.log(d.id,node.id);
            })


            // 可以在这里恢复被拖动元素的外观等操作
            let classStr = d3.select(this).attr('class')
            d3.select(this).attr('class', classStr.replace('grabbing-hover', ''))

            // 坐标辅助线 隐藏
            linePX.classed('hide', true)
            linePY.classed('hide', true)

            
            // getAllNodeData()
            // saveModel()
        });

    // 缩放 
    // let zoom = d3

    // 初始化力导向图
    let force;

    // 画布元素 d3 语法
    let svg = d3.select('#svgArea').append('svg')
        .attr('id', 'mySvg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        .attr('width', globalObj.svgWidth)
        .attr('height', globalObj.svgHeight)
        .append('g')

    // 添加画布背景 网格线
    svg.append('g').attr('class', 'grid-layout')
    drawGridLayout()

    // rect 元素
    let zoomOverlay = svg.append('rect')
        .attr("width", globalObj.svgWidth)
        .attr("height", globalObj.svgHeight)
        .style('fill', 'none')
        .style('pointer-event', 'all')
    // g container元素
    let container = svg.append('g')
        .attr("transform", 'translate(0,0) scale(1)')
        .attr("class", 'container')

    // 坐标辅助线x  坐标辅助线y
    let linePX, linePY
    // 坐标辅助线x
    linePX = container.append('path')
        .attr('class', 'linePX hide',)
        .attr('d', 'M0,0 L0,0',)
        .attr('stroke', '#cfcfcf',)
        .attr('stroke-width', '2',)
        .attr('stroke-dasharray', '3 3')

    // 坐标辅助线y
    linePY = container.append('path')
        .attr('class', 'linePy hide',)
        .attr('d', 'M0,0 L0,0',)
        .attr('stroke', '#cfcfcf',)
        .attr('stroke-width', '2',)
        .attr('stroke-dasharray', '3 3')
    // 初始化数据
    initialize()

    /**
     * @description: 初始化数据
     */
    async function initialize() {
        // 获取 处理数据
        getModelById({ id: 'model1' })

        // 绑定事件
        bindEvents()

    }

    /**
     * @description: s根据id获取节点             
     */
    function getNodeById(id) {
        let nodes = force.nodes().filter(function (n) {
            return n.id == id
        })
        return nodes[0]
    }

    /**
     * @description: 获取当前所有节点数据，用于 保存提交
     */
    function getAllNodeData() {
        let nodes = $('.svg_node')
        let lines = $('.link')
        globalObj.svgData = {
            nodes: [],
            lines: []
        } // 置空 重新赋值
        nodes.each(function (index, node) {
            let type = $(node).attr('el-type')
            let nodeObj = {}
            switch (type) {
                case 'circle':// 圆形绘制
                    nodeObj['id'] = $(node).attr('id')
                    nodeObj['r'] = parseFloat($(node).attr('r'))
                    nodeObj['cx'] = parseFloat($(node).attr('cx'))
                    nodeObj['cy'] = parseFloat($(node).attr('cy'))
                    nodeObj['x'] = parseFloat($(node).attr('cx'))
                    nodeObj['y'] = parseFloat($(node).attr('cy'))
                    nodeObj['type'] = $(node).attr('el-type')
                    nodeObj['pic'] = $(node).attr('pic')
                    nodeObj['data'] = $(node).attr('data-value')
                    nodeObj['stroke'] = $(node).attr('stroke')
                    nodeObj['fill'] = $(node).attr('fill')
                    break;
                case 'rect':// 矩形绘制
                    nodeObj['id'] = $(node).attr('id')
                    nodeObj['width'] = parseFloat($(node).attr('width'))
                    nodeObj['height'] = parseFloat($(node).attr('height'))
                    nodeObj['x'] = parseFloat($(node).attr('x'))
                    nodeObj['y'] = parseFloat($(node).attr('y'))
                    nodeObj['cx'] = parseFloat($(node).attr('cx'))
                    nodeObj['cy'] = parseFloat($(node).attr('cy'))
                    nodeObj['rx'] = parseFloat($(node).attr('rx'))
                    nodeObj['ry'] = parseFloat($(node).attr('ry'))
                    nodeObj['type'] = $(node).attr('el-type')
                    nodeObj['pic'] = $(node).attr('pic')
                    nodeObj['data'] = $(node).attr('data-value')
                    nodeObj['stroke'] = $(node).attr('stroke')
                    nodeObj['fill'] = $(node).attr('fill')
                    break;
                    case 'triangle':// 三角形绘制
                case 'polygon':
                    // 多边形绘制                            
                    nodeObj['id'] = $(node).attr('id')
                    nodeObj['points'] = $(node).attr('points')
                    nodeObj['sides'] = parseFloat($(node).attr('sides'))
                    nodeObj['r'] = parseFloat($(node).attr('r'))
                    nodeObj['x'] = parseFloat($(node).attr('x'))
                    nodeObj['y'] = parseFloat($(node).attr('y'))
                    nodeObj['cx'] = parseFloat($(node).attr('cx'))
                    nodeObj['cy'] = parseFloat($(node).attr('cy'))
                    nodeObj['type'] = $(node).attr('el-type')
                    nodeObj['pic'] = $(node).attr('pic')
                    nodeObj['data'] = $(node).attr('data-value')
                    nodeObj['stroke'] = $(node).attr('stroke')
                    nodeObj['fill'] = $(node).attr('fill')
                    console.log(nodeObj);

                    break;
                default:
                    break;
            }
            globalObj.svgData.nodes.push(nodeObj)
        })
        $('.link').attr('style', 'stroke-dasharray: 5 0;')
        lines.each(function (index, line) {
            let data = JSON.parse($(line).attr('data-value'))
            let lineObj = {
                id: data.id,
                sourceId: data.sourceId,
                targetId: data.targetId,
                stroke: $(line).attr('stroke'),
                fill: $(line).attr('fill'),
                style: $(line).attr('style')
            }
            globalObj.svgData.lines.push(lineObj)
        })
    }


    /**
     * @description: 获取画布数据 调用接口
     */
    function getModelById(params) {
        $.ajax({
            type: "get",
            url: "./data.json",
            params: params,
            dataType: "json",
            success: function (res) {
                globalObj.svgData = res;
                // console.log(res.nodes);
                globalObj.currentNodeId = `tempNodeId_${res.nodes.length}`
                $('.exampleNodeName .nodeName').val(globalObj.currentNodeId)
                // console.log(globalObj.currentNodeId);

                // 绘制示例 节点元素形状
                drawExampleShape()

                // 原始数据不能直接用，得处理一下
                // 节点处理
                nodesMap = genNodesMap(globalObj.svgData.nodes)
                let nodes = Object.values(nodesMap)
                // 起点和终点相同时的映射关系，暂时不用
                linesMap = genLinesMap(globalObj.svgData.lines)
                // 连线处理
                let lines = initLines(globalObj.svgData.lines)

                // 初始化力图
                initForce(nodes, lines)
            },
            error: function (xhr, status, error) {
                // console.log("Error: " + error);
            }
        });
    }

    /**
     * @description: 模拟接口
     */
    function getModelById1(params) {

        const data = {
            modelId: 'model1',
            lines: globalObj.svgData.lines,
            nodes: globalObj.svgData.nodes,
        };
        // JSON.stringify(data)

        globalObj.svgData = data;
        console.log(globalObj.svgData.nodes);


        // console.log(globalObj.currentNodeId);
        // 绘制示例 节点元素形状
        drawExampleShape()
        // 原始数据不能直接用，得处理一下
        // 节点处理
        nodesMap = genNodesMap(globalObj.svgData.nodes)
        console.log(nodesMap);

        let nodes = Object.values(nodesMap)
        // 起点和终点相同时的映射关系，暂时不用
        linesMap = genLinesMap(globalObj.svgData.lines)
        // 连线处理
        let lines = initLines(globalObj.svgData.lines)

        // console.log(nodes);
        
        // 初始化力图
        initForce(nodes, lines)

        // 真实画布上是否存在当前操作节点，true存在，false不存在
        if (!judgeNodeIsSave()) {
            globalObj.currentNodeId = `tempNodeId_${data.nodes.length}`
            $('.exampleNodeName .nodeName').val(globalObj.currentNodeId)
        }
    }

    /**
     * @description: 保存画布内容
     */
    function saveModel() {
        // console.log('123',globalObj.svgData.nodes, globalObj.svgData.lines);

        // 获取 处理数据

        getModelById1({ id: 'model1' })

    }

    /**
     * @description: 元素绑定事件
     */
    function bindEvents() {
        // 键盘按下事件监听
        $('body')
            .on('keydown', function (e) {
                // console.log(e);
                if (e.which == 17) {
                    // ctrl 键按下
                    ctrl_key = true
                }
            })
            .on('keyup', function (e) {
                // console.log(e);
                if (e.which == 17) {
                    // ctrl 键按下
                    ctrl_key = false
                }
            })
            .on('mousedown', function (e) { })
            .on('mousemove', function (e) { })
            .on('mouseup', function (e) { })
            .on('click', function (e) { })

        // jquery 方法获取、绑定元素事件  画布的拖拽功能
        $('#svgArea')
            .on('mousedown', function (e) {
                // console.log(e);
                // e.which 1鼠标左键  2鼠标中间  3鼠标右键  
                if (e.which == 1) {
                    // console.log('svg mousedown e.which 1');
                    if (!ctrl_key) {
                        $('.node_slt').removeClass('node_slt')
                        selecteAreaObj.isMove = true
                        selecteAreaObj.startX = e.pageX - $('#svgArea').offset().left
                        selecteAreaObj.startY = e.pageY - $('#svgArea').offset().top
                    }

                }
                else if (e.which == 2) { }
                else if (e.which == 3) {
                    svgDrawingObj.startX = e.clientX;
                    svgDrawingObj.startY = e.clientY;
                    svgDrawingObj.isDragging = true;
                    $('#mySvg').addClass('grabbing-hover')
                }
            })
            .on('mousemove', function (e) {
                // 画布框选时
                if (selecteAreaObj.isMove) {
                    // console.log('svg mousemove selecteAreaObj.isMove=true');

                    // 只保留最后一次的轨迹
                    clearSelectionRect()
                    selecteAreaObj.endX = e.pageX - $('#svgArea').offset().left
                    selecteAreaObj.endY = e.pageY - $('#svgArea').offset().top
                    if (selecteAreaObj.startX > selecteAreaObj.endX) {
                        // 右下向左上 款选  这样做是为了 避免鼠标最终在 svgArea上触发它的click事件
                        selecteAreaObj.endX -= 1
                        selecteAreaObj.endY -= 1
                    }

                    // 绘制框选区域
                    drawSelectionRect()
                }
                // 画布拖拽时
                if (svgDrawingObj.isDragging) {
                    // console.log('svg mousemove svgDrawingObj.isDragging=true');
                    // 计算本次移动相对于上次总偏移量的偏移量
                    var dx = e.clientX - svgDrawingObj.startX;
                    var dy = e.clientY - svgDrawingObj.startY;

                    // 更新总偏移量
                    svgDrawingObj.svgTranslateX += dx;
                    svgDrawingObj.svgTranslateY += dy;

                    // 边界范围判断
                    if (svgDrawingObj.svgTranslateX > svgTranslateAreaRange.left) {
                        svgDrawingObj.svgTranslateX = 0;
                    }
                    if (svgDrawingObj.svgTranslateY > svgTranslateAreaRange.top) {
                        svgDrawingObj.svgTranslateY = 0;
                    }
                    if (svgDrawingObj.svgTranslateX < svgTranslateAreaRange.right) {
                        svgDrawingObj.svgTranslateX = svgTranslateAreaRange.right;
                    }
                    if (svgDrawingObj.svgTranslateY < svgTranslateAreaRange.bottom) {
                        svgDrawingObj.svgTranslateY = svgTranslateAreaRange.bottom;
                    }

                    // 更新本次移动的起始坐标，以便下次移动计算
                    svgDrawingObj.startX = e.clientX;
                    svgDrawingObj.startY = e.clientY;

                    // 进行移动
                    $('#mySvg').css('transform', 'translate(' + svgDrawingObj.svgTranslateX + 'px, ' + svgDrawingObj.svgTranslateY + 'px)');
                }
            })
            .on('mouseup', function (e) {
                // e.which 1鼠标左键  2鼠标中间  3鼠标右键  
                if (e.which == 1) {
                    // console.log('svg mouseup e.which 1');
                    // console.log(selecteAreaObj.startX,selecteAreaObj.startY,selecteAreaObj.endX,selecteAreaObj.endY,selecteAreaObj.diffX,selecteAreaObj.diffY,);

                    if (!ctrl_key) {
                        // 取消框选状态
                        selecteAreaObj.isMove = false
                        if (selecteAreaObj.endX === 0 && selecteAreaObj.endY === 0) {
                            selecteAreaObj.endX = selecteAreaObj.startX
                            selecteAreaObj.endY = selecteAreaObj.startY
                        }
                        selecteAreaObj.diffX += selecteAreaObj.endX - selecteAreaObj.startX
                        selecteAreaObj.diffY += selecteAreaObj.endY - selecteAreaObj.startY

                        $('.dataNode').each(function (index, node) {
                            let $node = $(this)
                            let left = $node.position().left - $('#svgArea').offset().left
                            let top = $node.position().top - $('#svgArea').offset().top
                            let right = left + $node.width()
                            let bottom = top + $node.height()

                            // console.log(node,left,top,right,bottom)

                            // 判断节点是否被框选中
                            if (isInsideSelectionRect({ left, top, right, bottom })) {
                                // console.log(d3.select(this));
                                $node.addClass('node_slt')
                            } else { }

                        })
                        // 重置相关数据
                        selecteAreaObj = {
                            ...selecteAreaObj,
                            isMove: false,
                            startX: 0,
                            startY: 0,
                            endX: 0,
                            endY: 0
                        }

                        // 清除框选区域
                        clearSelectionRect()
                    }
                    document.body.style.cursor = 'default'
                }
                else if (e.which == 2) { }
                else if (e.which == 3) {
                    // 鼠标右键拖拽手
                    $('#mySvg').removeClass('grabbing-hover')
                    svgDrawingObj.isDragging = false;
                }

            })
            .on('mouseout', function () {
                // 鼠标 移出其子元素时触发
                // console.log('svg mouseout');

                // 取消画布拖拽状态
                svgDrawingObj.isDragging = false;
            })
            // 鼠标移入事件（mouseenter）和鼠标移出事件（mouseleave）
            .on('mouseenter', function () {
                // 鼠标 移入画布
                // console.log('svg mouseenter');
            })
            .on('mouseleave', function () {
                // 鼠标 移出画布 
                // console.log('svg mouseleave');
                // 根据需要选择是否 清除框选区域
                clearSelectionRect()
                // 重置相关数据
                selecteAreaObj = {
                    ...selecteAreaObj,
                    isMove: false,
                    startX: 0,
                    startY: 0,
                    endX: 0,
                    endY: 0
                }
            })
            .on('click', function (e) {
                // console.log('svg click');

                // 点击空白位置，去除  node line 的选中效果
                d3.selectAll('.node_slt').classed('node_slt', false)
                d3.selectAll('.line_slt').classed('line_slt', false)

                // 示例节点 数据 重置 
                initExampleNode()
            })

        // 节点名修改
        $('.nodeName').on('input', function () {
            // 获取当前值
            var nodeName = $(this).val();

            // 获取真实画布上 节点
            let theNode = container.select(`[id="${globalObj.currentNodeId}"]`)
            // 真实画布上是否存在当前操作节点，true不存在，false存在
            if (!theNode.empty()) {
                let dataValue = JSON.parse(theNode.attr('data-value'))
                dataValue.name = nodeName
                // 修改其 name 字段
                theNode.attr('name', nodeName).attr('data-valeu', JSON.stringify(dataValue))
                // 修改显示的文字
                $(theNode.node().parentNode).find('text').html(nodeName)
            }
        })

        // 当 #nodeShapeSelect 下拉框的值发生改变时 节点形状
        $('#nodeShapeSelect').on('change', function () {
            // 获取当前选中的值
            var selectedShape = $(this).val();

            // 更换形状时，清除上一次操作的
            d3.select('.exampleSvg svg').select(`[id="${globalObj.currentNodeId}"]`).remove()

            // 这里可以根据需要设置其他参数，比如将选择的形状传递给某个函数进行后续处理等
            console.log("你选择的节点形状是：" + selectedShape);

            // 这里可以添加更多针对不同形状的具体处理逻辑
            $('.nodeShapeParamsSet.slt').addClass('hide')  // 隐藏所有 参数设置
            $('.nodeShapeParamsSet').removeClass('slt')  //移除所有 形状选择
            $(`li div[type="${selectedShape}"]`).removeClass('hide')  //显示选择的形状的参数设置
            $(`li div[type="${selectedShape}"]`).addClass('slt') //给选择的形状添加 slt 类

            // 设置示例节点 的初始默认参数
            switch (selectedShape) {
                case 'circle':
                    // 圆形绘制
                    $('.circleRadius').val(20)
                    console.log("圆形形状的额外处理逻辑可以在这里添加。");
                    break;
                case 'triangle':
                    // 三角形绘制
                    $('.triangleTheRadius').val(20)
                    console.log("三角形形状的额外处理逻辑可以在这里添加。");
                    break;
                case 'rect':
                    // 矩形绘制
                    $('.rectWidth').val(40)
                    $('.rectHeight').val(30)
                    console.log("矩形形状的额外处理逻辑可以在这里添加。");
                    break;
                case 'polygon':
                    // 多边形绘制
                    $('.polygonSideNumber').val(5)
                    $('.polygonTheRadius').val(20)
                    console.log("多边形形状的额外处理逻辑可以在这里添加。");
                    break;
                default:
                    break;
            }
            drawExampleShape();

        });

        // 节点 参数设置时，数字检验
        $('.nodeShapeParamsSet input').on('input', function () {
            let minValue = parseInt($(this).attr('min')) || 0; // 获取min属性值，若未设置则默认为0
            let inputValue = $(this).val();

            // 判断是否设置了min属性
            if ($(this).attr('min') !== undefined) {
                // 使用正则表达式检查是否为整数
                let regexInteger = /^\d+$/;
                if (!regexInteger.test(inputValue) || inputValue <= minValue) {
                    $(this).val(minValue);
                    $('.nodeShapeParamsSetTip').removeClass('hide');
                    $('.nodeShapeParamsSetTip').html('* 参数为大于等于0 的整数')
                    return
                } else {
                    $('.nodeShapeParamsSetTip').addClass('hide');
                }
            }
            else {
                // 使用正则表达式检查是否为正整数
                let regex = /^\d+$/;
                if (!regex.test(inputValue) || inputValue < 1) {
                    $(this).val(1);
                    $('.nodeShapeParamsSetTip').removeClass('hide');
                    $('.nodeShapeParamsSetTip').html('* 数值必须为正整数！'); 

                    return
                } else {
                    $('.nodeShapeParamsSetTip').addClass('hide');
                }
            }
            if($(`#nodeShapeSelect`).val() == 'triangle' || $(`#nodeShapeSelect`).val() == 'polygon' ){
                if(inputValue<3 && $(this).attr('class').includes('polygonSideNumber')){
                    $(this).val(3);
                    $('.nodeShapeParamsSetTip').removeClass('hide'); 
                    $('.nodeShapeParamsSetTip').html('* 最少要有3条边'); 
                    return
                }
            }
            drawExampleShape();
            
        });

        // 节点填充颜色 修改
        $('.exampleNodeFill .setColorBlock').on('input', function () {
            var colorValue = $(this).val();
            drawExampleShape()
        });

        // 节点边框颜色修改
        $('.exampleNodeStroke .setColorBlock').on('input', function () {
            var colorValue = $(this).val();
            drawExampleShape()
        });

        // 当 #lineShapeSelect 下拉框的值发生改变时 线条形状
        $('#lineShapeSelect').on('change', function () {
            // 获取当前选中的值
            var selectedShape = $(this).val();

            // // 更换形状时，清除上一次操作的
            // d3.select('.exampleSvg svg').select(`[id="${globalObj.currentNodeId}"]`).remove()

            // 这里可以根据需要设置其他参数，比如将选择的形状传递给某个函数进行后续处理等
            console.log("你选择的形状是：" + selectedShape);

            $('.lineShapeParamsSet.slt').addClass('hide')  // 隐藏所有 参数设置
            $('.lineShapeParamsSet').removeClass('slt')  //移除所有 形状选择
            $(`li div[type="${selectedShape}"]`).removeClass('hide')  //显示选择的形状的参数设置
            $(`li div[type="${selectedShape}"]`).addClass('slt') //给选择的形状添加 slt 类

            // 设置示例节点 的初始默认参数
            switch (selectedShape) {
                case 'solid':
                    // 实线 ————————————————
                    $('.solidWidth').val(1)
                    $('.dashedLong').val(10)
                    $('.dashedSpace').val(0)
                    console.log("solid的额外处理逻辑可以在这里添加。");
                    break;
                case 'dashed':
                    // 等距虚线------ -
                    $('.solidWidth').val(1)
                    $('.dashedLong').val(2)
                    $('.dashedSpace').val(2)
                    console.log("dashed的额外处理逻辑可以在这里添加。");
                    break;
                case 'dotted':
                    // ---------
                    $('.dottedLong1').val(6)
                    $('.dottedLong2').val(6)
                    $('.dotteSpace').val(2)
                    console.log("dotted的额外处理逻辑可以在这里添加。");
                    break;
                case 'customizeLine':
                    // 自定义 ---------
                    $('.customizeStrokeDasharray').val('8 8 8 8 2')
                    break;
                default:
                    break;
            }
            drawExampleLine();

        })

        // 线条 参数设置时，数字检验
        $('.setLineDataForm input[type="number"]').on('input', function () {
            let minValue = parseInt($(this).attr('min')) || 0; // 获取min属性值，若未设置则默认为0
            let inputValue = $(this).val();

            // 使用正则表达式检查是否为正整数
            let regex = /^\d+$/;
            if (!regex.test(inputValue) || inputValue < 1) {
                $(this).val(minValue);
                $('.lineShapeParamsSetTip').removeClass('hide');
            } else {
                $('.lineShapeParamsSetTip').addClass('hide');
            }
            drawExampleLine();

        });
        // 节点边框颜色修改
        $('.setLineDataForm .setColorBlock').on('input', function () {
            let colorValue = $(this).val();
            drawExampleLine()
        });
        // 自定义线条分段
        $('.customizeStrokeDasharray').on('input', function () {
            let colorValue = $(this).val();
            drawExampleLine()
        })
    }


    /**
     * @description: 清除框选区域的轨迹
     */
    function clearSelectionRect() {
        $('.selection-rect').remove()
    }
    /**
      * @description: 绘制框选区域
      */
    function drawSelectionRect() {
        let rect = $('<div class="selection-rect"></div>')
        rect.css({
            left: Math.min(selecteAreaObj.startX, selecteAreaObj.endX),
            top: Math.min(selecteAreaObj.startY, selecteAreaObj.endY),
            width: Math.abs(selecteAreaObj.endX - selecteAreaObj.startX),
            height: Math.abs(selecteAreaObj.endY - selecteAreaObj.startY),
        })
        $('#svgArea').append(rect)
    }
    /**
     * @description: 判断节点是否在框选区域
     */
    function isInsideSelectionRect(points) {
        const minX = Math.min(selecteAreaObj.startX, selecteAreaObj.endX)
        const maxX = Math.max(selecteAreaObj.startX, selecteAreaObj.endX)
        const minY = Math.min(selecteAreaObj.startY, selecteAreaObj.endY)
        const maxY = Math.max(selecteAreaObj.startY, selecteAreaObj.endY)

        return points.left >= minX && points.top >= minY && points.right <= maxX && points.bottom <= maxY
    }
    /**
     * @description: 绘制示例 节点元素形状
     */
    function drawExampleShape() {
        let svg = d3.select('.exampleSvg svg')  // 示例图形所在的 svg元素
        svg.selectAll("*").remove();
        if(!$('.nodeShapeParamsSetTip').attr('class').includes('hide')){
            $('.nodeShapeParamsSetTip').addClass('hide');
        }

        // 示例元素的一些基本信息参数
        let shapeType = $(`.nodeShapeParamsSet.slt`).attr('type')  // 获取当前选择形状类型
        let svg_center_x = svg.node().clientWidth / 2;  // 示例 svg 元素 中心点 x
        let svg_center_y = svg.node().clientHeight / 2; // 示例 svg 元素 中心点 y
        let node_name = $(`li.exampleNodeName .nodeName`).val()
        let circle_r // 圆 半径
        let rect_width = $(`li div[type="${shapeType}"] .rectWidth`).val()// 矩形宽
        let rect_height = $(`li div[type="${shapeType}"] .rectHeight`).val() // 矩形 高
        let rect_round_x = $(`li div[type="${shapeType}"] .rectRoundX`).val() // 矩形 圆角 rectRound
        let rect_round_y = $(`li div[type="${shapeType}"] .rectRoundY`).val() // 矩形 圆角 rectRound
        let polygon_number = $(`li div[type="${shapeType}"] .polygonSideNumber`).val() // 多边形边数
        let polygon_radius = $(`li div[type="${shapeType}"] .polygonTheRadius`).val() // 多边形外接圆半径
        let triangle_radius = $(`li div[type="${shapeType}"] .triangleTheRadius`).val() // 三角形外接圆半径
        
        let stroke = $('.exampleNodeStroke input').val() // 边框
        let fill = $('.exampleNodeFill input').val() // 填充颜色
        // console.log(globalObj.currentNodeId);

        const drag1 = d3.drag()
            .on("start", function (event, d) {
                // 开始拖拽时的操作，
            })
            .on("drag", function (event, d) {
                let $this = $(this)

                switch ($this.attr('el-type')) {
                    case 'circle':// 圆形绘制
                        // 拖拽过程中的操作，更新圆的位置
                        d3.select(this).attr("cx", d3.event.x).attr("cy", d3.event.y);
                        break;
                    
                    case 'rect':// 矩形绘制
                        // 拖拽过程中的操作，更新 矩形 的位置
                        d3.select(this).attr("x", d3.event.x).attr("y", d3.event.y);
                        d3.select(this).attr("cx", d3.event.x + parseInt(d3.select(this).attr('width')) / 2).attr("cy", d3.event.y + parseInt(d3.select(this).attr('height')) / 2);
                        break;
                    case 'triangle':// 三角形绘制
                    polygon_radius = triangle_radius
                    polygon_number = 3 
                    case 'polygon':// 多边形绘制
                    // 新的圆心位置
                    let theCP = {
                        x:d3.event.x,
                        y:d3.event.y
                    }
                    // 根据圆心得到新的 points 
                    let newPoints = getPolygonCoordinates(theCP.x, theCP.y, polygon_radius, polygon_number)
                    d3.select(this).attr("points",newPoints)
                    .attr('x',d3.event.x)
                    .attr('cx',d3.event.x)
                    .attr('y',d3.event.y)
                    .attr('cy',d3.event.y)

                        break;
                    default:
                        break;
                }
            })
            .on("end", function (event, d) {
                // 检查是否拖拽到了另一个画布
                let modelSvg = d3.select('#mySvg').node().getBoundingClientRect()
                let new_x = d3.event.x - modelSvg.left
                let new_y = d3.event.y - modelSvg.top

                let newG = d3.select('.nodes').append('g').attr('class', `node_${$(this).attr('id')} pointer-hover`)

                let $this = $(this)
                let nodeObj = {}

                // // 在newG上添加一个新的circle元素并设置相同的属性
                switch ($this.attr('el-type')) {
                    case 'circle':// 圆形绘制
                        if (d3.event.x >= modelSvg.left && d3.event.y >= modelSvg.top) {
                            getAllNodeData()
                            nodeObj['id'] = $this.attr('id')
                            nodeObj['r'] = parseFloat($this.attr('r'))
                            nodeObj['cx'] = parseFloat(new_x)
                            nodeObj['cy'] = parseFloat($this.attr('cy'))
                            nodeObj['x'] = parseFloat(new_x)
                            nodeObj['y'] = parseFloat($this.attr('cy'))
                            nodeObj['type'] = $this.attr('el-type')
                            nodeObj['pic'] = $this.attr('pic')
                            nodeObj['data'] = $this.attr('data-value')
                            nodeObj['stroke'] = $this.attr('stroke')
                            nodeObj['fill'] = $this.attr('fill')
                            globalObj.svgData.nodes.push(nodeObj)
                            saveModel()
                        }
                        $this.remove();
                        break;
                    case 'rect':// 矩形绘制
                        // console.log(d3.event.x >= modelSvg.left && d3.event.y >= modelSvg.top);
                        if (d3.event.x >= modelSvg.left && d3.event.y >= modelSvg.top) {
                            getAllNodeData()
                            nodeObj['id'] = $this.attr('id')
                            nodeObj['width'] = $this.attr('width')
                            nodeObj['height'] = $this.attr('height')
                            nodeObj['x'] = new_x
                            nodeObj['y'] = $this.attr('y')
                            nodeObj['cx'] = new_x + parseInt($this.attr('width')) / 2
                            nodeObj['cy'] = $this.attr('y') + parseInt($this.attr('height')) / 2
                            nodeObj['rx'] = $this.attr('rx')
                            nodeObj['ry'] = $this.attr('ry')
                            nodeObj['type'] = $this.attr('el-type')
                            nodeObj['pic'] = $this.attr('pic')
                            nodeObj['data'] = $this.attr('data-value')
                            nodeObj['stroke'] = $this.attr('stroke')
                            nodeObj['fill'] = $this.attr('fill')
                            globalObj.svgData.nodes.push(nodeObj)
                            saveModel()
                        }
                        $this.remove();
                        break;
                    case 'triangle':// 三角形绘制
                    case 'polygon':// 多边形绘制
                    if (d3.event.x >= modelSvg.left && d3.event.y >= modelSvg.top) {
                        let newPoints = getPolygonCoordinates(new_x, new_y, polygon_radius, polygon_number)
                        
                            getAllNodeData()
                            nodeObj['id'] = $this.attr('id')
                            nodeObj['points'] = newPoints
                            nodeObj['sides'] = parseFloat($this.attr('sides'))
                            nodeObj['r'] = parseFloat($this.attr('r'))
                            nodeObj['x'] = parseFloat(new_x)
                            nodeObj['y'] = parseFloat(new_y)
                            nodeObj['cx'] = parseFloat(new_x)
                            nodeObj['cy'] = parseFloat(new_y)
                            nodeObj['type'] = $this.attr('el-type')
                            nodeObj['pic'] = $this.attr('pic')
                            nodeObj['data'] = $this.attr('data-value')
                            nodeObj['stroke'] = $this.attr('stroke')
                            nodeObj['fill'] = $this.attr('fill')
                            globalObj.svgData.nodes.push(nodeObj)
                            
                            saveModel()
                        }
                        $this.remove();
                        break;

                    default:
                        break;
                }
                drawExampleShape()
            });

        // 获取真实画布上 节点 
        let theNode = container.select(`[id="${globalObj.currentNodeId}"]`)
        // console.log(theNode,shapeType, globalObj.currentNodeId);

        switch (shapeType) {
            case 'circle':// 圆形绘制
                circle_r = $(`li div[type="${shapeType}"] .circleRadius`).val()
                svg.append('circle')
                    .attr('class', 'exampleNode pointer-hover')
                    .attr('name', node_name)
                    .attr('el-type', shapeType)
                    .attr('data-value', JSON.stringify({
                        name: node_name,
                        status: 1,
                        nodeType: ''
                    }))
                    .attr('id', globalObj.currentNodeId)
                    .attr('r', circle_r)
                    .attr('cx', svg_center_x)
                    .attr('cy', svg_center_y)
                    .attr('stroke', stroke)
                    .attr('fill', fill)
                    .call(drag1)

                if (!theNode.empty()) {
                    // 如果形状没变，则直接进行原有的修改
                    if (theNode.attr('el-type') === shapeType) {
                        theNode
                            .attr('name', node_name)
                            .attr('data-value', JSON.stringify({
                                name: node_name,
                                status: 1,
                                nodeType: ''
                            }))
                            .attr('r', circle_r)
                            .attr('stroke', stroke)
                            .attr('fill', fill)
                    } else {
                        // 原始节点修改为圆形节点，重新加载画布，修改节点
                        let nodeObj = {}
                        nodeObj['id'] = theNode.attr('id')
                        nodeObj['r'] = parseFloat(circle_r)
                        nodeObj['cx'] = parseFloat(theNode.attr('cx'))
                        nodeObj['cy'] = parseFloat(theNode.attr('cy'))
                        nodeObj['x'] = parseFloat(theNode.attr('cx'))
                        nodeObj['y'] = parseFloat(theNode.attr('cy'))
                        nodeObj['type'] = shapeType
                        nodeObj['pic'] = theNode.attr('pic')
                        nodeObj['data'] = theNode.attr('data-value')
                        nodeObj['stroke'] = theNode.attr('stroke')
                        nodeObj['fill'] = theNode.attr('fill')
                        theNode.remove() // 移除原有节点

                        getAllNodeData() // 根据元素 获取设置接口需要的参数 nodes,lines 
                        globalObj.svgData.nodes.push(nodeObj) // 将新节点加入参数对象
                        saveModel() // 保存画布，重新加载内容
                        globalObj.currentNodeId = nodeObj.id // 加载完后，修改当前操作元素id为当前元素
                    }
                }
                break;
            case 'rect':// 矩形绘制
                svg.append('rect')
                    .attr('class', 'exampleNode pointer-hover')
                    .attr('name', node_name)
                    .attr('el-type', shapeType)
                    .attr('data-value', JSON.stringify({
                        name: node_name,
                        status: 1,
                        nodeType: ''
                    }))
                    .attr('id', globalObj.currentNodeId)
                    .attr('x', svg_center_x - rect_width / 2)
                    .attr('y', svg_center_y - rect_height / 2)
                    .attr('cx', svg_center_x)
                    .attr('cy', svg_center_y)
                    .attr('rx', rect_round_x)
                    .attr('ry', rect_round_y)
                    .attr('width', rect_width)
                    .attr('height', rect_height)
                    .attr('stroke', stroke)
                    .attr('fill', fill)
                    .call(drag1)
                if (!theNode.empty()) {
                    // 如果形状没变，则直接进行原有的修改
                    if (theNode.attr('el-type') === shapeType) {
                        theNode
                            .attr('name', node_name)
                            .attr('data-value', JSON.stringify({
                                name: node_name,
                                status: 1,
                                nodeType: ''
                            }))
                            .attr('rx', rect_round_x)
                            .attr('ry', rect_round_y)
                            .attr('width', rect_width)
                            .attr('height', rect_height)
                            .attr('stroke', stroke)
                            .attr('fill', fill)
                    } else {
                        // 原始节点修改为 对应形状，重新加载画布，修改节点
                        let nodeObj = {}
                        nodeObj['id'] = theNode.attr('id')
                        nodeObj['width'] = parseFloat(rect_width)
                        nodeObj['height'] = parseFloat(rect_height)
                        nodeObj['x'] = parseFloat(theNode.attr('cx'))
                        nodeObj['y'] = parseFloat(theNode.attr('cy'))
                        nodeObj['cx'] = parseFloat(theNode.attr('cx'))
                        nodeObj['cy'] = parseFloat(theNode.attr('cy'))
                        nodeObj['rx'] = parseFloat(rect_round_x)
                        nodeObj['ry'] = parseFloat(rect_round_y)
                        nodeObj['type'] = shapeType
                        nodeObj['pic'] = theNode.attr('pic')
                        nodeObj['data'] = theNode.attr('data-value')
                        nodeObj['stroke'] = theNode.attr('stroke')
                        nodeObj['fill'] = theNode.attr('fill')
                        theNode.remove() // 移除原有节点

                        getAllNodeData() // 根据元素 获取设置接口需要的参数 nodes,lines 
                        globalObj.svgData.nodes.push(nodeObj) // 将新节点加入参数对象
                        saveModel() // 保存画布，重新加载内容
                        globalObj.currentNodeId = nodeObj.id // 加载完后，修改当前操作元素id为当前元素
                    }
                }

                break;
            case 'triangle':// 三角形绘制
            polygon_radius = $(`li div[type="triangle"] .triangleTheRadius`).val()
            polygon_number = 3
            case 'polygon':// 多边形绘制
            
            polygon_radius = polygon_number == 3 ? polygon_radius : $(`li div[type="${shapeType}"] .polygonTheRadius`).val()
            polygon_number = polygon_number == 3 ? 3 : $(`li div[type="${shapeType}"] .polygonSideNumber`).val()
            let newPoints = getPolygonCoordinates(svg_center_x, svg_center_y, polygon_radius, polygon_number)
            // console.log(polygon_radius,polygon_number,newPoints);
            
                svg.append('polygon')
                    .attr('class', 'exampleNode pointer-hover')
                    .attr('name', node_name)
                    .attr('el-type', shapeType)
                    .attr('data-value', JSON.stringify({
                        name: node_name,
                        status: 1,
                        nodeType: ''
                    }))
                    .attr('id', globalObj.currentNodeId)
                    .attr('r', polygon_radius)
                    .attr('sides', polygon_number)
                    .attr('points', newPoints)
                    .attr('cx', svg_center_x)
                    .attr('cy', svg_center_y)
                    .attr('stroke', stroke)
                    .attr('fill', fill)
                    .call(drag1)

                if (!theNode.empty()) {
                    // 如果形状没变，则直接进行原有的修改
                    if (theNode.attr('el-type') === shapeType) {
                        theNode
                            .attr('name', node_name)
                            .attr('data-value', JSON.stringify({
                                name: node_name,
                                status: 1,
                                nodeType: ''
                            }))
                            .attr('r', polygon_radius)
                            .attr('sides', polygon_number)
                            .attr('points', getPolygonCoordinates(parseInt(theNode.attr('x')), parseInt(theNode.attr('y')), polygon_radius, polygon_number))
                            .attr('stroke', stroke)
                            .attr('fill', fill)
                    } 
                    else {
                        // 原始节点修改为 对应形状，重新加载画布，修改节点
                        let nodeObj = {}
                            nodeObj['id'] = theNode.attr('id')
                            nodeObj['points'] = getPolygonCoordinates(parseInt(theNode.attr('cx')), parseInt(theNode.attr('cy')), polygon_radius, polygon_number)
                            nodeObj['sides'] = parseFloat(polygon_number)
                            nodeObj['r'] = parseFloat(polygon_radius)
                            nodeObj['x'] = parseFloat(theNode.attr('x'))
                            nodeObj['y'] = parseFloat(theNode.attr('y'))
                            nodeObj['cx'] = parseFloat(theNode.attr('cx'))
                            nodeObj['cy'] = parseFloat(theNode.attr('cy'))
                            nodeObj['type'] = shapeType
                            nodeObj['pic'] = theNode.attr('pic')
                            nodeObj['data'] = theNode.attr('data-value')
                            nodeObj['stroke'] = theNode.attr('stroke')
                            nodeObj['fill'] = theNode.attr('fill')

                        theNode.remove() // 移除原有节点

                        getAllNodeData() // 根据元素 获取设置接口需要的参数 nodes,lines 
                        globalObj.svgData.nodes.push(nodeObj) // 将新节点加入参数对象
                        saveModel() // 保存画布，重新加载内容
                        globalObj.currentNodeId = nodeObj.id // 加载完后，修改当前操作元素id为当前元素
                    }
                }
                break;
            default:
                break;
        }

    }

    /**
     * @description: 绘制示例 连线
     */
    function drawExampleLine() {
        let svg = d3.select('.exampleSvg svg')  // 示例图形所在的 svg元素
        svg.selectAll("*").remove();

        // 线条的 绘制参数
        let svg_center_x = svg.node().clientWidth / 2;  // 示例 svg 元素 中心点 x
        let svg_center_y = svg.node().clientHeight / 2; // 示例 svg 元素 中心点 y
        let line_color = $('.setLineDataForm .setColorBlock').val() // 颜色
        $('.solidWidth').removeClass('hide')
        let line_shape = $('.lineShapeParamsSet.slt').attr('type') // 样式
        let line_width = $('.solidWidth').val()  // 线宽

        let stroke_dasharray = `` // 间隔样式

        let line_sourceNode // 起点
        let line_targetNode // 终点

        let str = `M ${svg_center_x - 100} ${svg_center_y} L ${svg_center_x + 100} ${svg_center_y}`
        // console.log(str);

        switch (line_shape) {
            case 'solid':
                // 实线 ————————————————
                stroke_dasharray = `${$('.dashedLong').val()} ${$('.dashedSpace').val()}`
                break;
            case 'dashed':
                // 等距虚线------ -
                stroke_dasharray = `${$('.dashedLong').val()} ${$('.dashedSpace').val()}`
                break;
            case 'dotted':
                // ---------
                stroke_dasharray = `${$('.dottedLong1').val()} ${$('.dottedLong2').val()} ${$('.dottedSpace').val()}`
                break;
            case 'customizeLine':
                // 自定义 ---------
                stroke_dasharray = $('.customizeStrokeDasharray').val()
                break;
            default:
                break;
        }
        let line = svg.append('path')
            .attr('class', 'exampleLine')
            .attr('stroke', line_color)
            .attr('fill', 'transparent')
            .attr('stroke-width', line_width)
            .attr('stroke-dasharray', stroke_dasharray)
            .attr('data-value', '')
            .attr('d', str)
        $('.line_slt').each(function (line) {
            let markerId = $(this).attr('marker-end').split('#')[1].split(')')[0]
            // 更改选中线箭头样式
            $(`marker[id="${markerId}"] path`).attr('fill', line_color)
            // 更改选中线的样式
            $(this).attr({
                "line-type": line_shape,
                stroke: line_color,
                fill: 'transparent',
                "stroke-width": line_width,
                "stroke-dasharray": stroke_dasharray,
                // "style": `stroke-width:${line_width}; stroke:${line_color};stroke-width:${line_width}`
            })

        })

    }

    /**
     * @description: 将 nodes 转化成 map形式
     */
    function genNodesMap(nodes) {
        let hash = {}
        nodes.map(function (n, i) {
            hash[n.id] = {
                ...n,
                name: JSON.parse(n.data).name,
                status: JSON.parse(n.data).status,
                nodeType: JSON.parse(n.data).nodeType,
            }
        })
        return hash
    }
    /**
     * @description: 将 lines 转化成 map形式
     */
    function genLinesMap(lines) {
        let hash = {}
        lines.map(function (line) {
            let sourceId = line.sourceId
            let targetId = line.targetId
            let label = line.label // 初始数据无该字段，后续节点操作添加？暂不确定，先写这
            let key = sourceId + '-' + targetId
            if (hash[key]) {
                hash[key] += 1
                hash[key + '-label'] += '、' + label
            } else {
                hash[key] = 1
                hash[key + '-label'] = label
            }
        })
        return hash
    }

    /**
     * @description: 处理 api 获取的连线数据
     */
    function initLines(lines) {
        // console.log(lines);
        let newlines = lines.map(function (item) {
            return {
                id: item.id,
                d: item.d,
                type: item.type,
                source: nodesMap[item.sourceId],
                target: nodesMap[item.targetId],
                stroke: item.stroke,
                fill: item.fill,
                strokeWidth: item.strokeWidth,
                strokeDasharray: item.strokeDasharray,
                style: item.style,
            }
        })
        return newlines
    }

    /**
     * @description: 初始化力图
     */
    function initForce(nodes, lines) {
        // console.log('initForce');

        container.select('defs').remove()     // 去除上次元素，重新加载
        container.selectAll('.link').remove()     // 去除上次元素，重新加载
        container.select('g').remove()    // 去除上次元素，重新加载

        // 力图初始化设置
        force = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(0)) // 设置电荷力强度，可根据需求调整
            .force("collide", d3.forceCollide().radius(20).strength(0.01)) // 设置碰撞力半径和强度，可根据需求调整
            .force("link", d3.forceLink(lines).id(d => d.id).strength(0.01)); // 设置链接力及强度，可根据需求调整

        // 节点
        // console.log(force.nodes());
        let nodeCreat = container.append('g').attr('class', 'nodes').selectAll('.node')
            .data(nodes).enter().append('g').call(drag)
            .on('click', function (e) {
                console.log('node click', ctrl_key);
                d3.event.stopPropagation(); // 阻止事件冒泡
                if (!ctrl_key) {
                    // 判断是否 多选，不是则将多余的slt取消
                    d3.selectAll('.node_slt').classed('node_slt', false)
                }
                $(this).addClass('node_slt')
                nodeClick(this)
            })
            .on('mouseenter', function (e) {
                // console.log('节点mouseenter ', e);
            })
            .on('mouseout', function (e) {
                // console.log('节点mouseout ', e);
            })
            .on('mouseup', function (e) {
                // console.log('节点mouseup ', e);
            })

        // 根据type字段的值来创建对应的图形元素（circle或rect）
        nodeCreat.each(function (d) {
            // console.log(d);
            const node = d3.select(this);
            node.attr('class', `dataNode node_${d.id} pointer-hover`)
            switch (d.type) {
                case 'circle':
                    // 圆形绘制
                    node.append('circle')
                        .attr('el-type', d.type)
                        .attr('class', function (item) {
                            if (item.status == 0 || item.status == 1) { }
                            return `svg_node node_${item.id}`
                        })
                        .attr('name', d.name)
                        .attr('id', d.id)
                        .attr('pic', d.pic)
                        .attr('data-value', d.data)
                        .attr('r', parseInt(d.r)) // 这里可以根据需求设置圆的半径
                        .attr('cx', parseInt(d.cx)) // 初始x坐标，后续可能会通过力导向布局更新
                        .attr('cy', parseInt(d.cy)) // 初始y坐标，后续可能会通过力导向布局更新
                        .attr('tempx', d.cx)
                        .attr('tempy', d.cy)
                        .attr('stroke', d.stroke)
                        .attr('fill', d.fill);
                    node.append('text').attr('x', parseInt(d.cx) - parseInt(d.r)).attr('y', parseInt(d.cy) + parseInt(d.r) + 20).html(d.name)

                    break;
                case 'rect':
                    // 矩形绘制
                    node.append('rect')
                        .attr('el-type', d.type)
                        .attr('class', function (item) {
                            if (item.status == 0 || item.status == 1) { }
                            return `svg_node node_${item.id}`
                        })
                        .attr('name', d.name)
                        .attr('id', d.id)
                        .attr('pic', d.pic)
                        .attr('width', d.width) // 这里可以根据需求设置矩形的宽度
                        .attr('height', d.height) // 这里可以根据需求设置矩形的高度
                        .attr('x', parseInt(d.x)) // 初始x坐标，后续可能会通过力导向布局更新
                        .attr('y', parseInt(d.y)) // 初始y坐标，后续可能会通过力导向布局更新
                        .attr('cx', parseInt(d.cx)) // 节点的中心坐标
                        .attr('cy', parseInt(d.cy)) // 节点的中心坐标
                        .attr('rx', parseInt(d.rx)) // 初始y坐标，后续可能会通过力导向布局更新
                        .attr('ry', parseInt(d.ry)) // 初始y坐标，后续可能会通过力导向布局更新
                        .attr('tempx', d.x)
                        .attr('tempy', d.y)
                        .attr('data-value', d.data)
                        .attr('stroke', d.stroke)
                        .attr('fill', d.fill);
                    node.append('text').attr('x', parseInt(d.x)).attr('y', parseInt(d.y) + d.height + 20).html(d.name)

                    break
                case 'triangle':
                case 'polygon':
                    // console.log('d',d);
                    // 多边形绘制
                    node.append('polygon')
                        .attr('el-type', d.type)
                        .attr('class', `svg_node node_${d.id}`)
                        .attr('name', d.name)
                        .attr('id', d.id)
                        .attr('pic', d.pic)
                        .attr('data-value', d.data)
                        .attr('points', d.points)
                        .attr('sides', d.sides)
                        .attr('r', parseInt(d.r)) // 这里可以根据需求设置圆的半径
                        .attr('cx', parseInt(d.cx)) // 初始x坐标，后续可能会通过力导向布局更新
                        .attr('cy', parseInt(d.cy)) // 初始y坐标，后续可能会通过力导向布局更新
                        .attr('x', d.cx)
                        .attr('y', d.cy)
                        .attr('tempx', d.cx)
                        .attr('tempy', d.cy)
                        .attr('stroke', d.stroke)
                        .attr('fill', d.fill);
                    // console.log(parseInt(d.cx) - parseInt(d.r), parseInt(d.cy) + parseInt(d.r) + 10);

                    node.append('text').attr('x', function(){
                        return parseInt(d.cx) - parseInt(d.r)
                    }).attr('y', function(){
                        return parseInt(d.cy) + parseInt(d.r) + 10
                    }).html(d.name)

                    break
                default:
                    break;
            }
        });

        // 节点间连线
        let linesLine = container.selectAll('.link').data(lines).enter()
            .append('path')
            .attr('class', 'link pointer-hover')
            .attr('line-type', function (line) { return line.type })
            .attr('marker-end', function (line) { return 'url(#marker-' + line.id + ')' })
            .attr('d', function (line) { return getlinkPath(line, nodeCreat) })
            .attr('data-value', function (line) {
                return JSON.stringify({
                    "id": line.id,
                    "sourceId": line.source.id,
                    "targetId": line.target.id
                })
            })
            .attr('stroke', function (line) { return line.stroke })
            .attr('fill', function (line) { return line.fill })
            .attr('stroke-width', function (line) { return line.strokeWidth })
            .attr('stroke-dasharray', function (line) { return line.strokeDasharray })

        // 线的点击事件
        linesLine
            .on('click', function () {
                // console.log('line click');
                d3.event.stopPropagation(); // 阻止事件冒泡 
                if (!ctrl_key) {
                    // 判断是否 多选，不是则将多余的slt取消
                    d3.selectAll('.line_slt').classed('line_slt', false)
                }
                $(this).addClass('line_slt')

                lineCilck()
            })
            .on('mouseenter', function (e) {
                $(this).addClass('line_hover')
                // console.log('节点mouseenter ', e);
            })
            .on('mouseout', function (e) {
                $(this).removeClass('line_hover')
                // console.log('节点mouseout ', e);
            })
            .on('mouseup', function (e) {
                // console.log('节点mouseup ', e);
            })

        // 创建标记元素
        let marker = container.append('defs')
            .selectAll('marker')
            .data(lines)
            .enter()
            .append('marker');
        // 设置标记元素的属性
        marker.attr('id', function (link) {
            return 'marker-' + link.id;
        });
        marker.attr('markerUnits', 'userSpaceOnUse');
        marker.attr('viewBox', '0 -5 10 10');
        marker.attr('refX', function (line) {
            return genMarkerRefX(line)
        });
        marker.attr('refY', 0);
        marker.attr('markerWidth', 12);
        marker.attr('markerHeight', 12);
        marker.attr('orient', 'auto');
        marker.attr('stroke-width', 2);
        // 添加路径元素并设置属性
        marker.append('path')
            // .attr('d', 'M2,0 L-1,-5 L9,0 L-1,5 M2,0 L-1,-5')
            .attr('d', 'M9,0 L-1,5 L2,0 L-1,-5 L9,0')
            .attr('fill', 'black');

        // console.log(container);
        // 选择SVG元素

        // 选择要移动的g元素
        const gElement = container.select('g');

        // 获取SVG中的除了要移动的g元素之外的所有子元素
        const otherChildren = container.selectAll('*').filter(function (d, i) {
            return d3.select(this).node() !== gElement.node();
        });

        // 将g元素插入到SVG所有其他子元素的最后
        otherChildren.each(function () {
            container.node().appendChild(gElement.node());
        });

        // 力导向图的tick事件处理函数，用于更新节点和连线的位置
        force.on("tick", function () {
            uptateForce(nodeCreat, linesLine, marker)
            globalObj.isInitForce = false
        })
            .on("end", function () {
                $('.loading-mask').addClass('hide').removeClass('not-allowed-hover');
            });

        // 获取真实画布上 节点
        let theNode = container.select(`[id="${globalObj.currentNodeId}"]`)
        // 真实画布上是否存在当前操作节点，true不存在，false存在
        if (!theNode.empty()) {
            // 给元素添加 选中样式
            let theParentNode = d3.select(theNode.node().parentNode)
            theParentNode.attr('class', theParentNode.attr('class') + ' node_slt')
        }

        // 这里添加辅助线，会在节点上也显示出来，根据需要修改
        // // 坐标辅助线x
        // linePX = container.append('path')
        //     .attr('class', 'linePX hide',)
        //     .attr('d', 'M0,0 L0,0',)
        //     .attr('stroke', 'gray',)
        //     .attr('stroke-width', '2',)
        //     .attr('stroke-dasharray', '3 3')

        // // 坐标辅助线y
        // linePY = container.append('path')
        //     .attr('class', 'linePy hide',)
        //     .attr('d', 'M0,0 L0,0',)
        //     .attr('stroke', 'gray',)
        //     .attr('stroke-width', '2',)
        //     .attr('stroke-dasharray', '3 3')


    }
    /**
     * @description: 力图更新方法
     */
    function uptateForce(nodeCreat, linesLine, marker) {
        globalObj.forceUpdateCount++
        // console.log('124',force.alpha(),globalObj.forceUpdateCount);

        if (globalObj.isInitForce) {
            $('.loading-mask').removeClass('hide').addClass('not-allowed-hover')
        }

        if (globalObj.forceUpdateCount % globalObj.forceUpdateSpace !== 0) {
            nodeCreat.each(function (d) {
                const node = d3.select(this).select('.svg_node');

                const text = d3.select(this).select('text');
                let tempObj = genTextPosition(node, text)
                text.attr('x', tempObj.baseX).attr('y', tempObj.baseY)

            })
            linesLine.attr('d', function (line) { return getlinkPath(line, nodeCreat) })
            marker.attr('refX', function (line) {
                return genMarkerRefX(line)
            });

        } else {
            force.stop()
            $('.loading-mask').addClass('hide').removeClass('not-allowed-hover');
            // globalObj.forceUpdateCount=0
        }
    }

    /**
     * @description: 获取文字基线位置
     */
    function genTextPosition(node, text) {
        let baseX = 0 // 文字基线位置
        let baseY = 0 // 文字基线位置
        let type = node.attr('el-type')
        // let centerX = getCenterPositionX(text.node().getBBox().x,text.node().getBBox().width)

        switch (type) {
            case 'circle':
                // let diffx =  parseInt(node.attr('cx'))-centerX // 圆的中心x坐标 相对于文字的中心x坐标位置 ，
            baseX = parseInt(node.attr('cx')) - parseInt(node.attr('r'))
            baseY = parseInt(node.attr('cy')) + parseInt(node.attr('r')) + 20
            break
            case 'rect':
                // let diffx =  parseInt(node.attr('x')) + globalObj.nodeSizeConfig.width/2-centerX
            baseX = parseInt(node.attr('x'))
            baseY = parseInt(node.attr('y')) + parseInt(node.attr('height')) + 20
            break
            case 'triangle':// 三角形绘制
            case 'polygon':// 多边形绘制
            baseX = parseInt(node.attr('cx')) - parseInt(node.attr('r'))
            baseY = parseInt(node.attr('cy')) + parseInt(node.attr('r')) + 10
            break
            default:
                return
        }
        // console.log(text.html());
        return { baseX, baseY }
    }
    /**
     * @description: 计算中心坐标 x
     */
    function getCenterPositionX(x, w) {
        return x + w / 2
    }
    /**
     * @description: 计算中心坐标 y
     */
    function getCenterPositionY(y, h) {
        return y + h / 2
    }

    /**
     * @description: 绘制连线
     */
    function getlinkPath(line, nodes) {
        // console.log(line,nodes);
        let s_id = line.source.id // 起始节点id
        let t_id = line.target.id // 结束节点id
        let s_x = line.source.x // 开始节点的 x
        let t_x = line.target.x // 结束节点的 x
        let s_y = line.source.y // 开始节点的 y
        let t_y = line.target.y // 结束节点的 y
        if (nodes != null && nodes != undefined) {
            // console.log(nodes,nodes._groups[0]);
            $.each(nodes._groups[0], function (index, item) {
                // console.log(d3.select(this).attr('class').split('node_'));
                let type = d3.select(this).select('.svg_node').attr('el-type')  // 当前元素的 标签类型
                let n_id = d3.select(this).select('.svg_node').attr('id')  // 当前元素id
                let el_center_x // 节点元素的 中心点坐标 x
                let el_center_y // 节点元素的 中心点坐标 y

                switch(type){
                    case 'rect':// 矩形绘制
                        el_center_x = parseInt(d3.select(this).select('.svg_node').attr('x')) + parseInt(d3.select(this).select('.svg_node').attr('width')) / 2
                        el_center_y = parseInt(d3.select(this).select('.svg_node').attr('y')) + parseInt(d3.select(this).select('.svg_node').attr('height')) / 2
                        break
                    case 'circle':// 圆形绘制
                    case 'triangle':// 三角形绘制
                    case 'polygon':// 多边形绘制
                        el_center_x = d3.select(this).select('.svg_node').attr('cx')
                        el_center_y = d3.select(this).select('.svg_node').attr('cy')
                    default:
                        break 
                }

                // console.log(d3.select(this),el_center_x,el_center_y);
                    // console.log(s_id,t_id,n_id);
                    
                if (s_id === n_id) {
                    s_x = el_center_x
                    s_y = el_center_y
                }
                if (t_id === n_id) {
                    t_x = el_center_x
                    t_y = el_center_y
                }
            })
        }
        // console.log( s_x, s_y, t_x, t_y,);
        return `M${s_x},${s_y} L${t_x},${t_y}`
    }

    /**
     * @description: marker 标记的偏移计算
     */
    function genMarkerRefX(line) {
        let refX = 31 // 默认距离
        let diff = 5 // 手动偏移量

        switch (line.target.type) {
            case 'circle':// 圆形绘制
                return parseInt($(`.svg_node[id="${line.target.id}"]`).attr('r')) + diff
            case 'triangle':// 三角形绘制
                return parseInt($(`.svg_node[id="${line.target.id}"]`).attr('r')) + diff
            case 'rect':// 矩形绘制
                return getLineAndTargetPoint(line)
            case 'polygon':// 多边形绘制
                return parseInt($(`.svg_node[id="${line.target.id}"]`).attr('r')) + diff
            default:
                return refX
        }
        /**
         * @description: 得到线与终点节点的交点
         */
        function getLineAndTargetPoint(line) {

            // 获取线的起点（source矩形中心）坐标
            let sourceRect = $(`.svg_node[id="${line.source.id}"]`);
            let sourceCenterX = parseInt(sourceRect.attr('x')) + parseInt(sourceRect.attr('width')) / 2;
            let sourceCenterY = parseInt(sourceRect.attr('y')) + parseInt(sourceRect.attr('height')) / 2;

            // 获取线的终点（target矩形中心）坐标
            let targetRect = $(`.svg_node[id="${line.target.id}"]`);
            let targetCenterX = parseInt(targetRect.attr('x')) + parseInt(targetRect.attr('width')) / 2;
            let targetCenterY = parseInt(targetRect.attr('y')) + parseInt(targetRect.attr('height')) / 2;

            let slope; // 计算线的斜率 ,起点和终点 中心之间的连线
            let intercept = 0; // 计算线的截距
            if (targetCenterX - sourceCenterX !== 0) {
                slope = (targetCenterY - sourceCenterY) / (targetCenterX - sourceCenterX);
                intercept = sourceCenterY - slope * sourceCenterX;
            } else {
                slope = Infinity;
            }


            let k1, k2 // 分别是终点两条对角线之间的斜率
            k1 = parseInt(targetRect.attr('height')) / parseInt(targetRect.attr('width')) // 左上到右下 
            k2 = -k1 // 右上到左下

            // 根据 x 求 y
            function getYFromX(x, slope, intercept) {
                return slope * x + intercept;
            }
            // 根据 y 求 x
            function getXFromY(y, slope, intercept) {
                if (slope !== 0) {
                    return (y - intercept) / slope;
                } else {
                    // 处理直线平行于x轴的情况，比如给出提示等
                    console.log("该直线平行于x轴，无法根据y唯一确定x");
                    return null;
                }
            }
            // 计算两点间距离的函数
            function calculateDistance(pointA, pointB) {
                const dx = pointB.x - pointA.x;
                const dy = pointB.y - pointA.y;
                return Math.sqrt(dx * dx + dy * dy) + diff;
            }
            // console.log(slope,isFinite(slope));

            if (!isFinite(slope)) {
                // 直线垂直于x轴, 说明两个节点 垂直方向中心 x点相同
                return parseInt(targetRect.attr('height')) / 2 + diff
            }
            else if (slope == 0) {
                // 直线垂直于y轴, 说明两个节点 水平方向中心 y点相同
                return parseInt(targetRect.attr('width')) / 2 + diff
            }
            else {
                let topY = parseInt(targetRect.attr('y'))    // 上边 的 y 坐标
                let bottomY = parseInt(targetRect.attr('y')) + parseInt(targetRect.attr('height'))  // 下边 的 y 坐标
                let leftX = parseInt(targetRect.attr('x'))   // 左边 的 x 坐标
                let rightX = parseInt(targetRect.attr('x')) + parseInt(targetRect.attr('width'))    // 右边 的 x 坐标
                let intersectionTop, intersectionBottom, intersectionLeft, intersectionRight
                // 计算与上边的交点
                let intersectionTopX = getXFromY(topY, slope, intercept);
                if (intersectionTopX >= leftX && intersectionTopX <= rightX && parseInt(targetRect.attr('y')) > parseInt(sourceRect.attr('y'))) {
                    // console.log('1');
                    intersectionTop = { x: intersectionTopX, y: topY };
                    return calculateDistance(intersectionTop, { x: targetCenterX, y: targetCenterY })
                }

                // 计算与下边的交点
                let intersectionBottomX = getXFromY(bottomY, slope, intercept);
                if (intersectionBottomX >= leftX && intersectionBottomX <= rightX && parseInt(targetRect.attr('y')) < parseInt(sourceRect.attr('y'))) {
                    // console.log('2');
                    intersectionBottom = { x: intersectionBottomX, y: bottomY };
                    return calculateDistance(intersectionBottom, { x: targetCenterX, y: targetCenterY })
                }

                // 计算与左边的交点
                let intersectionLeftY = getYFromX(leftX, slope, intercept);
                if (intersectionLeftY >= topY && intersectionLeftY <= bottomY && parseInt(targetRect.attr('x')) > parseInt(sourceRect.attr('x'))) {
                    // console.log('3');
                    intersectionLeft = { x: leftX, y: intersectionLeftY };
                    return calculateDistance(intersectionLeft, { x: targetCenterX, y: targetCenterY })
                }

                // 计算与右边的交点
                let intersectionRightY = getYFromX(rightX, slope, intercept);
                if (intersectionRightY >= topY && intersectionRightY <= bottomY && parseInt(targetRect.attr('x')) < parseInt(sourceRect.attr('x'))) {
                    // console.log('4');
                    intersectionRight = { x: rightX, y: intersectionRightY };
                    return calculateDistance(intersectionRight, { x: targetCenterX, y: targetCenterY })
                }

                // 这里可以根据需要返回所有交点组成的数组或者进行其他处理
                // 例如：
                let intersections = [];
                if (intersectionTop) intersections.push(intersectionTop);
                if (intersectionBottom) intersections.push(intersectionBottom);
                if (intersectionLeft) intersections.push(intersectionLeft);
                if (intersectionRight) intersections.push(intersectionRight);
                // console.log(intersections);

            }
            // console.log(sourceCenterX, sourceCenterY, targetCenterX, targetCenterY, slope, intercept);
            // console.log('123',line);

            return refX // 上面都没有执行，返回默认距离
        }
    }

    /**
     * @description: 节点点击事件
     */
    function nodeClick($this) {
        let node = $('.node_slt .svg_node').eq(0)
        let type = node.attr('el-type')
        // console.log(node.attr('name'));

        $('.nodeName').val(node.attr('name'))
        $('#nodeShapeSelect').val(type)
        $('.nodeShapeParamsSet.slt').addClass('hide')  // 隐藏所有 参数设置
        $('.nodeShapeParamsSet').removeClass('slt')  //移除所有 形状选择
        $(`li div[type="${type}"]`).removeClass('hide')  //显示选择的形状的参数设置
        $(`li div[type="${type}"]`).addClass('slt') //给选择的形状添加 slt 类

        $('.exampleNodeStroke .setColorBlock').val(convertColorToHex(node.attr('stroke')))
        $('.exampleNodeFill .setColorBlock').val(convertColorToHex(node.attr('fill')))

        // 更换时，清除左侧样例
        d3.select('.exampleSvg svg').select(`[id="${globalObj.currentNodeId}"]`).remove()
        globalObj.currentNodeId = node.attr('id')
        switch (type) {
            case 'circle':// 圆形绘制
                $('.circleRadius').val(node.attr('r'))
                break;
            
            case 'rect':// 矩形绘制
                $('.rectWidth').val(node.attr('width'))
                $('.rectHeight').val(node.attr('height'))
                $('.rectRoundX').val(node.attr('rx'))
                $('.rectRoundY').val(node.attr('ry'))
                break;
                case 'triangle':// 三角形绘制
                $('.triangleTheRadius').val(parseInt(node.attr('r')))
                break;
            case 'polygon':// 多边形绘制
                $('.polygonSideNumber').val(parseInt(node.attr('sides')))
                $('.polygonTheRadius').val(parseInt(node.attr('r')))
                console.log(node.attr('sides'),$('.polygonSideNumber').val(),$('.polygonTheRadius').val());
                
                break;

            default:
                break;
        }
        controlExampleShow(true)
    }

    /**
     * @description: 示例节点 数据 重置 
     */
    function initExampleNode($this) {
        // 节点名称重置

        globalObj.currentNodeId = `tempNodeId_${$('.svg_node').length}`
        $('.exampleNodeName .nodeName').val(globalObj.currentNodeId)

        // 形状重置 默认圆形
        $('#nodeShapeSelect').val('circle')

        $('.nodeShapeParamsSet.slt').addClass('hide')  // 隐藏所有 参数设置
        $('.nodeShapeParamsSet').removeClass('slt')  //移除所有 形状选择
        $(`li div[type="circle"]`).removeClass('hide')  //显示选择的形状的参数设置
        $(`li div[type="circle"]`).addClass('slt') //给选择的形状添加 slt 类

        // 默认半径20
        $('.circleRadius').val(20)

        // 默认填充颜色
        $('.exampleNodeFill .setColorBlock').val('#F0E0E0')

        // 默认边框颜色
        $('.exampleNodeStroke .setColorBlock').val('#000000')

        drawExampleShape()
    }

    /**
     * @description: 线的点击事件
     */
    function lineCilck($this) {
        let line = $('.line_slt').eq(0)
        let type = line.attr('line-type')

        $('#lineShapeSelect').val(type)

        $('.lineShapeParamsSet.slt').addClass('hide')  // 隐藏所有 参数设置
        $('.lineShapeParamsSet').removeClass('slt')  //移除所有 形状选择
        $(`li div[type="${type}"]`).removeClass('hide')  //显示选择的形状的参数设置
        $(`li div[type="${type}"]`).addClass('slt') //给选择的形状添加 slt 类

        $('.setLineDataForm .setColorBlock').val(line.attr('stroke')) // 颜色
        $('.solidWidth').val(line.attr('stroke-width'))  // 线宽

        // 设置示例节点 的初始默认参数
        switch (type) {
            case 'solid':
                // 实线 ————————————————
                console.log("solid的额外处理逻辑可以在这里添加。");
                break;
            case 'dashed':
                // 等距虚线------ -
                $('.dashedLong').val(line.attr('stroke-dasharray').split(' ')[0])
                $('.dashedSpace').val(line.attr('stroke-dasharray').split(' ')[1])
                console.log("dashed的额外处理逻辑可以在这里添加。");
                break;
            case 'dotted':
                // ---------
                $('.dottedLong1').val(line.attr('stroke-dasharray').split(' ')[0])
                $('.dottedLong2').val(line.attr('stroke-dasharray').split(' ')[1])
                $('.dotteSpace').val(line.attr('stroke-dasharray').split(' ')[2])
                console.log("dotted的额外处理逻辑可以在这里添加。");
                break;
            case 'customizeLine':
                // 自定义 ---------
                $('.customizeStrokeDasharray').val(line.attr('stroke-dasharray'))
                break;
            default:
                break;
        }
        controlExampleShow(false)
    }


    /**
     * @description: 控制 参数显示 node的 还是 line的
     */
    function controlExampleShow(flag) {
        if (flag) {
            $('.setNodeDataForm').removeClass('hide')
            $('.setLineDataForm').addClass('hide')
            drawExampleShape()
        } else {
            $('.setNodeDataForm').addClass('hide')
            $('.setLineDataForm').removeClass('hide')
            drawExampleLine()
        }
    }

    /**
     * @description: 判断当前节点是否在画布上 true 存在  false  不存在
     */
    function judgeNodeIsSave() {
        let theNode = d3.select('.container').select(`[id="${globalObj.currentNodeId}"]`)
        // 真实画布上是否存在当前操作节点，true不存在，false存在
        return !theNode.empty()
    }

    /**
             * @description: 绘制背景网格
             */
    function drawGridLayout() {
        const svg = d3.select('#mySvg');
        const gridLayout = d3.select('.grid-layout')

        // // 设置网格线间距，可调整
        // const gridSpacing = 60;

        // 绘制水平网格线
        const horizontalLines = gridLayout.selectAll('path.horizontal-grid')
            .data(d3.range(0, svg.attr('height'), globalObj.gridSpacing))
            .enter()
            .append('path')
            .attr('class', 'horizontal-grid')
            .attr('d', function (d) {
                return `M0,${d} H${svg.attr('width')}`;
            })
            .attr('stroke', 'lightgray')
            .attr('stroke-width', '1')
            .attr('stroke-dasharray', '5 5');

        // 绘制垂直网格线
        const verticalLines = gridLayout.selectAll('path.vertical-grid')
            .data(d3.range(0, svg.attr('width'), globalObj.gridSpacing))
            .enter()
            .append('path')
            .attr('class', 'vertical-grid')
            .attr('d', function (d) {
                return `M${d},0 V${svg.attr('width')}`;
            })
            .attr('stroke', 'lightgray')
            .attr('stroke-width', '1')
            .attr('stroke-dasharray', '5 5');
    }

    /**
     * @description: 坐标吸附
     */
    function pointAdsorption(id, point) {
        // console.log(point);
        // 吸附 阈值
        // let adsorptionThreshold = 10

        // 分别获取点的x和y坐标
        let x = point.x;
        let y = point.y;
        // 记录原始x和y坐标，用于后续计算偏移量
        let originalX = x;
        let originalY = y;

        // 计算x坐标吸附到网格线的值
        x = Math.round(x / globalObj.gridSpacing) * globalObj.gridSpacing;
        if (Math.abs(x - point.x) <= globalObj.adsorptionThreshold) {
            x = Math.round(point.x / globalObj.gridSpacing) * globalObj.gridSpacing;
        } else {
            x = point.x;
        }


        // 计算y坐标吸附到网格线的值
        y = Math.round(y / globalObj.gridSpacing) * globalObj.gridSpacing;
        if (Math.abs(y - point.y) <= globalObj.adsorptionThreshold) {
            y = Math.round(point.y / globalObj.gridSpacing) * globalObj.gridSpacing;
        } else {
            y = point.y
        }

        // 计算x方向的偏移量
        let offsetX = x - originalX;
        // 计算y方向的偏移量
        let offsetY = y - originalY;

        return {
            x: x,
            y: y,
            offsetX: offsetX,
            offsetY: offsetY
        };
    }

    /**
     * @description: 根据 圆心，半径，边数 得到正多边形坐标
     */
    function getPolygonCoordinates(centerX, centerY, radius, sides) {
        const coordinates = [];
        const angleStep = (2 * Math.PI) / sides;

        // 偏移角度：基数边数调整为顶点与圆心在垂直方向
        let offsetAngle = 0;
        if (sides % 2 === 1) {
            offsetAngle = -Math.PI / 2; // 确保第一个顶点在y轴正方向
        }

        // 计算每个顶点的坐标
        for (let i = 0; i < sides; i++) {
            const angle = offsetAngle + i * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            coordinates.push(`${Math.round(x)},${Math.round(y)}`);
        }

        return coordinates.join(' ');
    }

    /**
     * @description: 得到多边形 圆心坐标
     */
    function findUniqueCircleCenter(r, pointString) {
        if (r <= 0) {
            throw new Error("Radius must be greater than zero.");
        }

        // 将字符串解析为点数组
        const points = pointString.split(" ").map(pair => {
            const [x, y] = pair.split(",").map(Number);
            return { x, y };
        });

        if (points.length < 2) {
            throw new Error("At least two points are needed to determine a unique circle center.");
        }

        // 使用前两个点来计算圆心
        const [p1, p2] = points;
        const { x: x1, y: y1 } = p1;
        const { x: x2, y: y2 } = p2;

        // 两点间的距离
        const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        if (d > 2 * r) {
            throw new Error("The points are too far apart to form a circle with the given radius.");
        }

        // 中点坐标
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // 距离中点到圆心的偏移量
        const offset = Math.sqrt(r ** 2 - (d / 2) ** 2);

        // 垂直平分线的单位向量
        const dx = (y2 - y1) / d;
        const dy = (x1 - x2) / d;

        // 圆心的两个可能位置
        const center1 = { x: midX + offset * dx, y: midY + offset * dy };
        const center2 = { x: midX - offset * dx, y: midY - offset * dy };

        // 检查哪个圆心符合所有点
        for (const point of points) {
            const dist1 = Math.sqrt((point.x - center1.x) ** 2 + (point.y - center1.y) ** 2);
            const dist2 = Math.sqrt((point.x - center2.x) ** 2 + (point.y - center2.y) ** 2);

            if (Math.abs(dist1 - r) > 1e-6) {
                return center2; // 如果 center1 不符合条件，返回 center2
            }
            if (Math.abs(dist2 - r) > 1e-6) {
                return center1; // 如果 center2 不符合条件，返回 center1
            }
        }

        // 如果都符合条件，返回第一个
        return center1;
    }


});
