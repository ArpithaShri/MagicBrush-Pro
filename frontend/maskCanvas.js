const { useRef, useEffect, useState, useImperativeHandle, forwardRef } = React;

/**
 * MaskCanvas UI:
 * - Layers: [Underlay Background] + [Overlay Canvas for Painting]
 * - Tool: Brush or Eraser
 * - Output: Base64 of the painted regions (alpha channel)
 */
const MaskCanvas = forwardRef(({ imageUrl }, ref) => {
    const canvasRef = useRef(null);
    const ctxRef    = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [isErasing, setIsErasing] = useState(false);
    const [undoStack, setUndoStack] = useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;

        // Initialize with empty black (meaning no mask)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToUndo();
    }, []);

    const saveToUndo = () => {
        const canvas = canvasRef.current;
        setUndoStack(prev => [...prev.slice(-19), canvas.toDataURL()]);
    };

    const undo = () => {
        if (undoStack.length <= 1) return;
        const newStack = [...undoStack];
        newStack.pop();
        const prevState = newStack[newStack.length - 1];
        
        const img = new Image();
        img.src = prevState;
        img.onload = () => {
            ctxRef.current.clearRect(0, 0, 512, 512);
            ctxRef.current.drawImage(img, 0, 0);
            setUndoStack(newStack);
        };
    };

    useImperativeHandle(ref, () => ({
        getMaskBase64: () => {
            return canvasRef.current.toDataURL("image/png");
        },
        hasPaintedMask: () => {
            const ctx = ctxRef.current;
            const data = ctx.getImageData(0,0,512,512).data;
            for(let i=3; i<data.length; i+=4) if(data[i] > 0) return true;
            return false;
        },
        loadMask: (maskUrl) => {
            if (!maskUrl) return;
            const img = new Image();
            img.src = maskUrl;
            img.onload = () => {
                ctxRef.current.clearRect(0, 0, 512, 512);
                ctxRef.current.drawImage(img, 0, 0);
                saveToUndo();
            };
        },
        clear: () => {
            ctxRef.current.clearRect(0,0,512,512);
            saveToUndo();
        }
    }));

    const startDrawing = (e) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        if (isDrawing) saveToUndo();
        setIsDrawing(false);
        ctxRef.current.beginPath();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        
        // Scale coords if displayed size != 512x512
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const ctx = ctxRef.current;
        ctx.lineWidth = brushSize;
        ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        ctx.strokeStyle = '#ffffff'; // White signifies "edit here"

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undoStack]);

    return (
        <div className="mask-editor-container">
            <div className="mask-canvas-wrapper">
                {/* Background Image */}
                <img src={imageUrl} alt="Background" className="mask-underlay" />
                
                {/* Painting Layer */}
                <canvas
                    ref={canvasRef}
                    width={512}
                    height={512}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    className="mask-canvas"
                />
            </div>

            {/* Toolbar - Now outside the canvas wrapper */}
            <div className="brush-toolbar">
                <div className="tool-group">
                    <button className={`tool-btn ${!isErasing ? 'active' : ''}`} onClick={() => setIsErasing(false)}>
                        <span className="tool-icon">🖌️</span> Brush
                    </button>
                    <button className={`tool-btn ${isErasing ? 'active' : ''}`} onClick={() => setIsErasing(true)}>
                        <span className="tool-icon">🧽</span> Eraser
                    </button>
                    <button className="tool-btn undo-btn" onClick={undo}>
                        <span className="tool-icon">↩</span> Undo
                    </button>
                </div>
                
                <div className="toolbar-divider" />
                
                <div className="brush-size-control">
                    <span className="brush-size-label">Size: <span className="size-val">{brushSize}px</span></span>
                    <input 
                        type="range" 
                        min="5" 
                        max="150" 
                        value={brushSize} 
                        onChange={e => setBrushSize(Number(e.target.value))} 
                        className="brush-slider"
                    />
                </div>
            </div>
        </div>
    );
});

window.MaskCanvas = MaskCanvas;
