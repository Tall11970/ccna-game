import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiClient, User, UserListResponse } from '../services/api';
import { Trash2, Eye, RotateCcw } from 'lucide-react';
import './UsersPage.css';

interface UsersPageProps {
  onLogout: () => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, search, status]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await apiClient.getUsers(page, limit, search, status);
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    onLogout();
    navigate('/login');
  };

  const handleDelete = async (userId: string, email: string) => {
    if (confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      try {
        setActionInProgress(userId);
        await apiClient.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        alert('User deleted successfully');
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        alert(err.response?.data?.error || 'Failed to delete user');
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleResetProgress = async (userId: string, email: string) => {
    if (confirm(`Reset progress for ${email}? This will reset their level and XP to 0.`)) {
      try {
        setActionInProgress(userId);
        await apiClient.resetUserProgress(userId);
        alert('User progress reset successfully');
        fetchUsers();
      } catch (err: any) {
        console.error('Failed to reset progress:', err);
        alert(err.response?.data?.error || 'Failed to reset progress');
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleViewUser = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <Layout pageTitle="User Management" onLogout={handleLogout}>
      {error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by email or username..."
            value={search}
            onChange={handleSearch}
          />
          <select value={status} onChange={handleStatusChange}>
            <option value="active">All Users</option>
            <option value="admin">Admins Only</option>
            <option value="user">Regular Users</option>
          </select>
        </div>

        {isLoading ? (
          <div className="loading-container" style={{ height: '300px' }}>
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="no-data">
            <p>No users found</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Level</th>
                    <th>XP Points</th>
                    <th>Exam Type</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className={user.is_admin ? 'admin-badge' : ''}>
                          {user.email}
                          {user.is_admin && <span className="badge"> ADMIN</span>}
                        </span>
                      </td>
                      <td>{user.username || '-'}</td>
                      <td>{user.level}</td>
                      <td>{user.xp_points.toLocaleString()}</td>
                      <td>{user.exam_type || '-'}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleViewUser(user.id)}
                            disabled={actionInProgress === user.id}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleResetProgress(user.id, user.email)}
                            disabled={actionInProgress === user.id}
                            title="Reset user progress"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(user.id, user.email)}
                            disabled={actionInProgress === user.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                const pageNum = page > 2 ? page + i - 2 : i + 1;
                if (pageNum > pagination.pages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={pageNum === page ? 'btn-primary' : 'btn-secondary'}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === pagination.pages}
                className="btn-secondary"
              >
                Next
              </button>

              <span className="pagination-info">
                Page {page} of {pagination.pages} ({pagination.total} total)
              </span>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default UsersPage;
