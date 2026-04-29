// ==========================================
// Classes Page (Admin only)
// ==========================================

import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', academicYear: '', department: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { if (selectedYear) loadClasses(); }, [selectedYear]);

  const loadYears = async () => {
    const { data } = await api.get('/academic-years');
    setYears(data);
    if (data.length) setSelectedYear(data[0]._id);
  };

  const loadClasses = async () => {
    const { data } = await api.get(`/classes?academicYear=${selectedYear}`);
    setClasses(data);
  };

  const load = () => { loadYears(); };

  const openNew = () => {
    setForm({ name: '', academicYear: years[0]?._id || '', department: '' });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setForm({
      name: c.name,
      academicYear: c.academicYear?._id || c.academicYear,
      department: c.department || '',
    });
    setEditId(c._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/classes/${editId}`, form);
        toast.success('Updated!');
      } else {
        await api.post('/classes', form);
        toast.success('Created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return;
    try {
      await api.delete(`/classes/${id}`);
      toast.success('Deleted!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        <div className="flex gap-3 items-center">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input w-48">
            {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select>
          <button onClick={openNew} className="btn-primary">+ Add Class</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Class Name</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Academic Year</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Department</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {classes.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-gray-500">{c.academicYear?.name}</td>
                <td className="px-6 py-4 text-gray-500">{c.department || '—'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEdit(c)} className="text-primary-600 hover:underline text-sm">Edit</button>
                  <button onClick={() => handleDelete(c._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {classes.length === 0 && <p className="text-center text-gray-400 py-8">No classes found.</p>}
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Class' : 'Add Class'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Class Name (e.g. TE COMP A)</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="label">Academic Year</label>
            <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required className="input">
              <option value="">Select Year</option>
              {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input" placeholder="e.g. Computer Engineering" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
