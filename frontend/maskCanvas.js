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
        <div className="mask-canvas-wrapper" style={{ position: 'relative', width:'512px', height:'512px', background:'#000', borderRadius:'12px', overflow:'hidden' }}>
            {/* Background Image */}
            <img src={imageUrl} alt="Background" 
                 style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'contain', userSelect:'none' }} />
            
            {/* Painting Layer */}
            <canvas
                ref={canvasRef}
                width={512}
                height={512}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', cursor:'crosshair', touchAction:'none', opacity: 0.6 }}
            />

            {/* Toolbar */}
            <div className="brush-toolbar" style={{ position:'absolute', bottom:'1rem', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'0.8rem', background:'rgba(0,0,0,0.7)', padding:'0.6rem 1rem', borderRadius:'999px', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                <button className={`tool-btn ${!isErasing ? 'active' : ''}`} onClick={() => setIsErasing(false)}>🖌️ Brush</button>
                <button className={`tool-btn ${isErasing ? 'active' : ''}`} onClick={() => setIsErasing(true)}>🧽 Eraser</button>
                <button className="tool-btn" onClick={undo} style={{marginLeft:'0.5rem'}}>↩ Undo</button>
                <div style={{ height:'20px', width:'1px', background:'rgba(255,255,255,0.2)', margin:'0 4px' }} />
                <span className="brush-size-label" style={{ color:'#fff', fontSize:'0.75rem', alignSelf:'center' }}>Size</span>
                <input type="range" min="5" max="150" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} style={{ width:'80px' }} />
            </div>
        </div>
    );
});

window.MaskCanvas = MaskCanvas;
