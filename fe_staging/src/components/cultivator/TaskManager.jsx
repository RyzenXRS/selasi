import React, { useState, useEffect } from 'react';
import { cultivatorApi } from '../../services/api';
import { CheckSquare, Plus, Trash2, Calendar, Check, X } from 'lucide-react';

export const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    task_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    batch_id: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchBatches();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await cultivatorApi.getTasks();
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await cultivatorApi.getBatches();
      setBatches(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await cultivatorApi.createTask({
        ...form,
        batch_id: form.batch_id ? parseInt(form.batch_id) : null,
      });
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        task_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        batch_id: '',
      });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah tugas.');
    }
  };

  const handleComplete = async (id) => {
    try {
      await cultivatorApi.completeTask(id);
      fetchTasks();
    } catch (err) {
      alert('Gagal menyelesaikan tugas.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus tugas ini?')) {
      try {
        await cultivatorApi.deleteTask(id);
        fetchTasks();
      } catch (err) {
        alert('Gagal menghapus tugas.');
      }
    }
  };

  const filteredTasks = filterStatus === 'ALL'
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const getPriorityBadge = (p) => {
    if (p === 'high') return <span className="badge badge-danger">Tinggi</span>;
    if (p === 'medium') return <span className="badge badge-warning">Sedang</span>;
    return <span className="badge badge-info">Rendah</span>;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Daftar Tugas Harian</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            To-do list perawatan instalasi hidroponik, kalibrasi nutrisi, dan pengecekan tandon.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button 
              className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus('ALL')}
            >
              Semua
            </button>
            <button 
              className={`btn btn-sm ${filterStatus === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus('pending')}
            >
              Menunggu
            </button>
            <button 
              className={`btn btn-sm ${filterStatus === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus('completed')}
            >
              Selesai
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Tambah Tugas</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Memuat tugas...
        </div>
      ) : filteredTasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            return (
              <div 
                key={task.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isCompleted ? '#f8fafc' : '#ffffff',
                  opacity: isCompleted ? 0.75 : 1,
                  borderLeft: `4px solid ${isCompleted ? '#10b981' : task.priority === 'high' ? '#ef4444' : '#059669'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => !isCompleted && handleComplete(task.id)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: `2px solid ${isCompleted ? '#10b981' : 'var(--border-color)'}`,
                      background: isCompleted ? '#ecfdf5' : '#ffffff',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isCompleted ? 'default' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={isCompleted ? 'Selesai' : 'Klik untuk selesaikan'}
                  >
                    {isCompleted ? <Check size={16} /> : null}
                  </button>

                  <div>
                    <div style={{ 
                      fontSize: '0.95rem', 
                      fontWeight: 700, 
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)'
                    }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{task.task_date}</span>
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isCompleted && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleComplete(task.id)}>
                      <Check size={14} color="#059669" />
                      <span>Selesai</span>
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(task.id)} style={{ color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <CheckSquare size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tidak Ada Tugas</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Semua tugas harian telah diselesaikan atau belum dibuat.
          </p>
        </div>
      )}

      {/* MODAL TAMBAH TUGAS */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Tambah Tugas Baru</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Tugas</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Contoh: Kuras tandon NFT Meja A & isi nutrisi baru"
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi / Rincian</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Rincian takaran AB Mix atau prosedur yang harus dilakukan"
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Tanggal Pelaksanaan</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.task_date} 
                      onChange={e => setForm({ ...form, task_date: e.target.value })} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Prioritas</label>
                    <select 
                      className="form-select"
                      value={form.priority} 
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="high">Tinggi (Kritis)</option>
                      <option value="medium">Sedang (Rutin)</option>
                      <option value="low">Rendah</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tautkan ke Batch Budidaya (Opsional)</label>
                  <select 
                    className="form-select"
                    value={form.batch_id} 
                    onChange={e => setForm({ ...form, batch_id: e.target.value })}
                  >
                    <option value="">-- Tanpa Tautan Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_code} ({b.current_phase})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Tugas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
