// ==========================================
// Academic Years Page (Admin only)
// ==========================================

import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function AcademicYearsPage() {
  const [years, setYears] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/academic-years');
    setYears(data);
  };

  const openNew = () => {
    setForm({ name: '', startDate: '', endDate: '' });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (y) => {
    setForm({
      name: y.name,
      startDate: y.startDate?.substring(0, 10),
      endDate: y.endDate?.substring(0, 10),
    });
    setEditId(y._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/academic-years/${editId}`, form);
        toast.success('Updated!');
      } else {
        await api.post('/academic-years', form);
        toast.success('Created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this academic year?')) return;
    try {
      await api.delete(`/academic-years/${id}`);
      toast.success('Deleted!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Academic Years</h1>
        <button onClick={openNew} className="btn-primary">+ Add Year</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Start Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">End Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {years.map((y) => (
              <tr key={y._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{y.name}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(y.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(y.endDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${y.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {y.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEdit(y)} className="text-primary-600 hover:underline text-sm">Edit</button>
                  <button onClick={() => handleDelete(y._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {years.length === 0 && <p className="text-center text-gray-400 py-8">No academic years found.</p>}
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Academic Year' : 'Add Academic Year'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name (e.g. 2025-26)</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="input" />
            </div>
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
