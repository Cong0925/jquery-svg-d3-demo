/**
 * @description: 将各种表现颜色的形式转化为 16 进制形式的通用方法
 */
function convertColorToHex(color) {
    // 如果颜色已经是16进制形式，直接返回
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        return color;
    }

    // 如果是RGB形式，例如rgb(255, 0, 0)
    if (color.startsWith('rgb(') && color.endsWith(')')) {
        let rgbValues = color.slice(4, -1).split(',');
        let r = parseInt(rgbValues[0]);
        let g = parseInt(rgbValues[1]);
        let b = parseInt(rgbValues[2]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // 如果是RGBA形式，例如rgba(255, 0, 0, 0.5)
    if (color.startsWith('rgba(') && color.endsWith(')')) {
        let rgbaValues = color.slice(5, -1).split(',');
        let r = parseInt(rgbaValues[0]);
        let g = parseInt(rgbaValues[1]);
        let b = parseInt(rgbaValues[2]);
        // 这里忽略透明度值，只转换RGB部分为16进制
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // 如果是颜色名称形式，例如'red'
    let namedColors = {
        'aliceblue': '#f0f8ff',
        'antiquewhite': '#faebd7',
        'aqua': '#00ffff',
        'aquamarine': '#7fffd4',
        'azure': '#f0ffff',
        'beige': '#f5f5dc',
        'bisque': '#ffe4c4',
        'black': '#000000',
        'blanchedalmond': '#ffebcd',
        'blue': '#0000ff',
        'blueviolet': '#8a2be2',
        'brown': '#a52a2a',
        'burlywood': '#deb887',
        'cadetblue': '#5f9ea0',
        'chartreuse': '#7fff00',
        'chocolate': '#d2691e',
        'coral': '#ff7f50',
        'cornflowerblue': '#6495ed',
        'cornsilk': '#fff8dc',
        'crimson': '#dc143c',
        'cyan': '#00ffff',
        'darkblue': '#00008b',
        'darkcyan': '#008b8b',
        'darkgoldenrod': '#b8860b',
        'darkgray': '#a9a9a9',
        'darkgreen': '#006400',
        'darkkhaki': '#bdb76b',
        'darkmagenta': '#8b008b',
        'darkolivegreen': '#556b2f',
        'darkorange': '#ff8c00',
        'darkorchid': '#9933cc',
        'darkred': '#8b0000',
        'darksalmon': '#e9967a',
        'darkseagreen': '#8fbc8f',
        'darkslateblue': '#483d8b',
        'darkslategray': '#2f4f4f',
        'darkturquoise': '#00ced1',
        'darkviolet': '#9400d3',
        'deeppink': '#ff1493',
        'deepskyblue': '#00bffd',
        'dimgray': '#696969',
        'dodgerblue': '#1b9e77',
        'firebrick': '#b03e1f',
        'floralwhite': '#fffaf0',
        'forestgreen': '#228b22',
        'fuchsia': '#ff00ff',
        'gainsboro': '#dcdcdc',
        'ghostwhite': '#f8f8ff',
        'gold': '#ffd700',
        'goldenrod': '#daa520',
        'gray': '#808080',
        'green': '#00ff00',
        'greenyellow': '#adff2f',
        'honeydew': '#f0fff0',
        'hotpink': '#ff69b4',
        'indigo': '#4b008b',
        'ivory': '#fffff0',
        'khaki': '#f0e68c',
        'lavender': '#e6e6fa',
        'lavenderblush': '#fff0f5',
        'lawngreen': '#7cfc00',
        'lemonchiffon': '#fffacd',
        'lightblue': '#add8e6',
        'lightcoral': '#f08080',
        'lightcyan': '#e0ffff',
        'lightgoldenrodyellow': '#fafad2',
        'lightgray': '#d3d3d3',
        'lightgreen': '#90ee90',
        'lightpink': '#ffb6c4',
        'lightseagreen': '#20b2aa',
        'lightslategray': '#778899',
        'lightskyblue': '#87cefa',
        'lightsalmon': '#ffa07a',
        'lightsteelblue': '#b0c4de',
        'lightyellow': '#ffffe0',
        'lime': '#00ff00',
        'limegreen': '#32cd32',
        'linen': '#faf0e6',
        'magenta': '#ff00ff',
        'maroon': '#800000',
        'mediumaquamarine': '#66cdaa',
        'mediumblue': '#0000cd',
        'mediumorchid': '#ba55d3',
        'mediumpurple': '#9370db',
        'mediumseagreen': '#3cb371',
        'mediumslateblue': '#7b5195',
        'mediumturquoise': '#40e0d0',
        'mediumvioletred': '#c7143c',
        'mintcream': '#f5f5f5',
        'mistyrose': '#ffe4e1',
        'moccasin': '#ffe4b5',
        'navy': '#00007f',
        'olive': '#800000',
        'olivegreen': '#606040',
        'orange': '#ff8000',
        'orangutan': '#ffa500',
        'orchid': '#da70d6',
        'palevioletred': '#db7093',
        'periwinkle': '#ccccff',
        'pink': '#ffc0cb',
        'plum': '#dda0dd',
        'powderblue': '#b0e0e6',
        'purple': '#800080',
        'raspberry': '#e3007c',
        'red': '#ff0000',
        'rosywhite': '#ffe4e1',
        'royalblue': '#4169e1',
        'saffron': '#f4c430',
        'salmon': '#fa8072',
        'sandstone': '#a68a64',
        'seagreen': '#2e8b57',
        'seashell': '#fff5ee',
        'sienna': '#a95a42',
        'silver': '#c0c0c0',
        'skyblue': '#87ceeb',
        'slateblue': '#6a5acd',
        'slategray': '#708090',
        'snow': '#fffafa',
        'springgreen': '#00ff7f',
        'steelblue': '#466380',
        'tan': '#d2b48c',
        'teal': '#008080',
        'thistle': '#d8d8f8',
        'tomato': '#ff69b4',
        'turquoise': '#30e0d0',
        'violet': '#ee82ee',
        'wheat': '#f5f5dc',
        'white': '#ffffff',
        'whitesmoke': '#f5f5f5',
        'yellow': '#ffff00',
        'yellowgreen': '#9acd32'
    };
    if (namedColors.hasOwnProperty(color)) {
        return namedColors[color];
    }

    // 如果无法识别的颜色形式，返回默认值或抛出异常
    return '#000000'; // 这里可根据需求改为抛出异常等处理方式
}