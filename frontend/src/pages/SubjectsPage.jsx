// ==========================================
// Subjects Page
// ==========================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function SubjectsPage() {
  const { isAdmin } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', class: '', academicYear: '', faculty: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { if (selectedYear) loadSubjects(); }, [selectedYear]);

  const loadMeta = async () => {
    const { data: yr } = await api.get('/academic-years');
    setYears(yr);
    if (yr.length) setSelectedYear(yr[0]._id);
    if (isAdmin) {
      const [c, f] = await Promise.all([
        api.get('/classes'),
        api.get('/admin/faculty'),
      ]);
      setClasses(c.data);
      setFaculty(f.data);
    }
  };

  const loadSubjects = async () => {
    const { data } = await api.get(`/subjects?academicYear=${selectedYear}`);
    setSubjects(data);
  };

  const load = () => { loadMeta(); };

  const openNew = () => {
    setForm({ name: '', code: '', class: classes[0]?._id || '', academicYear: years[0]?._id || '', faculty: faculty[0]?._id || '' });
    setEditId(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/subjects/${editId}`, form);
        toast.success('Updated!');
      } else {
        await api.post('/subjects', form);
        toast.success('Created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <div className="flex gap-3 items-center">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input w-48">
            {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select>
          {isAdmin && <button onClick={openNew} className="btn-primary">+ Add Subject</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <div key={s._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <p className="text-sm text-gray-500">{s.code}</p>
              </div>
              <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">{s.class?.name}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Faculty: {s.faculty?.name}</p>
            <div className="flex gap-2">
              <Link to={`/results/${s._id}`} className="text-sm text-primary-600 hover:underline">Results</Link>
              <span className="text-gray-300">•</span>
              <Link to={`/activities?subject=${s._id}`} className="text-sm text-primary-600 hover:underline">Activities</Link>
            </div>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <p>No subjects found.</p>
        </div>
      )}

      {isAdmin && (
        <Modal show={showModal} onClose={() => setShowModal(false)} title="Add Subject">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Subject Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
            </div>
            <div>
              <label className="label">Subject Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="input" placeholder="e.g. CS301" />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required className="input">
                {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class</label>
              <select value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required className="input">
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign Faculty</label>
              <select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} required className="input">
                {faculty.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
