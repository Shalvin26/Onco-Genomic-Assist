import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchPatients = () => {
    setLoading(true);
    api.get('/patients', { params: { page, search } })
      .then((res) => {
        setPatients(res.data.patients);
        setTotalPages(res.data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPatients();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  return (
    <Layout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Patients</h1>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto shrink-0">
          + New Patient
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients by name..."
          className="w-full sm:max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Patients List */}
      {loading ? (
        <p className="text-muted-foreground text-sm py-4">Loading...</p>
      ) : patients.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No patients found.</p>
      ) : (
        <>
          <div className="space-y-2">
            {patients.map((patient) => (
              <Link
                key={patient._id}
                to={`/patients/${patient._id}`}
                className="block bg-card border border-border rounded-lg p-3.5 sm:p-4 hover:border-primary transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate text-sm sm:text-base">
                      {patient.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {patient.age ? `${patient.age} yrs` : ''} {patient.gender !== 'unspecified' ? `· ${patient.gender}` : ''}
                      {patient.patientIdentifier ? ` · ${patient.patientIdentifier}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-medium sm:hidden">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 bg-card border border-border rounded-lg p-3 sm:p-4 shadow-sm">
            <span className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Responsive New Patient Modal */}
      {showForm && (
        <NewPatientModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchPatients();
          }}
        />
      )}
    </Layout>
  );
}

function NewPatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'unspecified', patientIdentifier: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/patients', form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-lg p-5 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">New Patient</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Patient name"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="age"
            type="number"
            value={form.age}
            onChange={handleChange}
            placeholder="Age"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="unspecified">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input
            name="patientIdentifier"
            value={form.patientIdentifier}
            onChange={handleChange}
            placeholder="Patient ID (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}