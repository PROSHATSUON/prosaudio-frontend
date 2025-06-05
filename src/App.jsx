import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, file, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '12px',
    marginBottom: '12px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    background: '#fff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
    textAlign: 'left',
    position: 'relative',
    cursor: 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <strong>{file.name}</strong>
      <audio controls src={URL.createObjectURL(file)} style={{ marginTop: '8px', width: '100%' }} />
      <button
        onClick={() => onDelete(id)}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'none',
          border: 'none',
          fontSize: '0.9rem',
          cursor: 'pointer',
          opacity: 0.8
        }}
        title="削除"
      >
        🗑
      </button>
    </div>
  );
}

function App() {
  const [files, setFiles] = useState([]);
  const [mergedAudioUrl, setMergedAudioUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('https://prosaudio.onrender.com/upload', formData);
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const handleAddFiles = (newFiles) => {
    const filteredFiles = newFiles.filter(file => !files.some(f => f.name === file.name));
    filteredFiles.forEach(uploadFile);
    setFiles(prev => [...prev, ...filteredFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleAddFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleAddFiles(selectedFiles);
  };

  const deleteFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const resetAll = () => {
    setFiles([]);
    setMergedAudioUrl(null);
    stopPlayback();
  };

  const playSequential = async (index = 0) => {
    if (index >= files.length || !isPlaying) return;
    const audio = new Audio(URL.createObjectURL(files[index]));
    audioRef.current = audio;
    audio.play();
    audio.onended = () => playSequential(index + 1);
  };

  const startPlayback = () => {
    setIsPlaying(true);
    playSequential(0);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const mergeAudio = async () => {
    const fileNames = files.map(file => file.name);
    try {
      const response = await axios.post('https://prosaudio.onrender.com/merge', fileNames, {
        headers: { 'Content-Type': 'application/json' }
      });
      const mergedUrl = 'https://prosaudio.onrender.com' + response.data.url;
      setMergedAudioUrl(mergedUrl);
      alert('結合が完了しました！');
    } catch (error) {
      console.error('Merge failed:', error);
      alert('結合に失敗しました。');
    }
  };

  const downloadMergedAudio = async () => {
    try {
      const response = await axios.get(mergedAudioUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged_output.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ダウンロード失敗:', err);
      alert('ダウンロードに失敗しました。');
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id && over?.id && active.id !== over.id) {
      const oldIndex = files.findIndex(f => f.name === active.id);
      const newIndex = files.findIndex(f => f.name === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setFiles((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <div
      style={{
        background: '#f4f6f9',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '2rem'
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDrop={handleDrop}
      onDragLeave={() => setIsDragging(false)}
    >
      <div style={{
        width: '800px',
        background: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🎧 Audio Upload & Sort</h2>

        {mergedAudioUrl && (
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <audio controls src={mergedAudioUrl} style={{ flex: 1 }} />
            <button onClick={downloadMergedAudio} style={{ padding: '0.5rem 1rem' }}>
              Download
            </button>
          </div>
        )}

        <div
          style={{
            border: '2px dashed #aaa',
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: isDragging ? '#eef6ff' : '#fafafa',
            textAlign: 'center',
            borderRadius: '8px'
          }}
        >
          <p>ファイルをここにドラッグ＆ドロップ または選択</p>
          <input type="file" multiple accept="audio/*" onChange={handleFileChange} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={startPlayback}>Play All in Order</button>
          <button onClick={stopPlayback}>Stop</button>
          <button onClick={mergeAudio}>Merge</button>
          <button onClick={resetAll}>Reset</button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={files.map(f => f.name)} strategy={verticalListSortingStrategy}>
            {files.map((file) => (
              <SortableItem key={file.name} id={file.name} file={file} onDelete={deleteFile} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

export default App;
