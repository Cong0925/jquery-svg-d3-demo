/**
* @description: bugs提示面板 拖拽移动
*/
function enableDrag() {
    const element = $('.bugs-li-tip'); // 获取提示面板元素
    let isDragging = false; // 是否正在拖拽
    let startX, startY; // 鼠标起始位置
    let offsetX, offsetY; // 元素相对于鼠标的偏移
    
    element.on('mousedown', function (event) {
    // 防止选中文字
    event.preventDefault();
    
    isDragging = true;
    
    // 获取鼠标按下时的坐标
    startX = event.clientX;
    startY = event.clientY;
    
    // 计算元素与鼠标的相对位置
    const rect = element[0].getBoundingClientRect();
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;
    
    // 添加鼠标移动事件
    $(document).on('mousemove', handleMouseMove);
    
    // 添加鼠标松开事件
    $(document).on('mouseup', handleMouseUp);
    });
    
    function handleMouseMove(event) {
    if (isDragging) {
        const newLeft = event.clientX - offsetX;
        const newTop = event.clientY - offsetY;
    
        // 更新元素的位置
        element.css({
            left: `${newLeft}px`,
            top: `${newTop}px`,
            position: 'absolute' // 确保元素可以移动
        });
    }
    }
    
    function handleMouseUp() {
    isDragging = false;
    
    // 移除事件监听
    $(document).off('mousemove', handleMouseMove);
    $(document).off('mouseup', handleMouseUp);
    }
    }