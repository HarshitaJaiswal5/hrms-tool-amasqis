import React, { useState, useEffect } from 'react';
import { useSocket } from '../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';

interface Activity {
  _id: string;
  title: string;
  activityType: string;
  dueDate: string;
  owner: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface DeleteActivityProps {
  activity?: Activity | null;
  onActivityDeleted?: () => void;
}

const DeleteActivity = ({ activity, onActivityDeleted }: DeleteActivityProps) => {
  const socket = useSocket() as Socket | null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Helper to close modal
  const closeModal = () => {
    const modal = document.getElementById('delete_activity');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      } else {
        // Fallback: forcibly hide modal if Bootstrap instance is missing
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('show');
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }
  };

  // Reset state when activity changes
  useEffect(() => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, [activity]);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!activity || !activity._id) {
      setError('No activity selected');
      return;
    }

    if (!socket) {
      setError('No socket connection');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    console.log('Deleting activity:', activity);
    socket.emit('activity:delete', { activityId: activity._id });

    socket.once('activity:delete-response', (res: any) => {
      setLoading(false);
      console.log('Activity delete response:', res);

      if (res.done) {
        setSuccess(true);
        console.log('Activity deleted successfully');

        // Show success message briefly before closing
        setTimeout(() => {
          // Close modal
          closeModal();

          // Call callback to refresh activity list
          if (onActivityDeleted) {
            console.log('Calling onActivityDeleted callback');
            onActivityDeleted();
          }

          // Also dispatch global event as backup
          window.dispatchEvent(new CustomEvent('refresh-activities'));

          // Clear state after modal closes
          setTimeout(() => {
            setError(null);
            setSuccess(false);
          }, 300);
        }, 1000); // Show success message for 1 second
      } else {
        console.error('Activity delete failed:', res.error);
        setError(res.error || 'Failed to delete activity');
      }
    });
  };

  return (
    <>
      {/* Delete Activity Modal - Fallback for non-Popconfirm usage */}
      <div className="modal fade" id="delete_activity">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              {error ? (
                <div className="alert alert-danger text-center mb-3">
                  <i className="ti ti-alert-circle me-2"></i>
                  {error}
                </div>
              ) : success ? (
                <div className="alert alert-success text-center mb-3">
                  <i className="ti ti-check-circle me-2"></i>
                  Activity deleted successfully!
                </div>
              ) : !activity ? (
                <div className="p-4 text-muted text-center">No activity selected.</div>
              ) : (
                <>
                  <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                    <i className="ti ti-trash-x fs-36"></i>
                  </span>
                  <h4 className="mb-1">Confirm Delete</h4>
                  <p className="mb-3">
                    Are you sure you want to delete the activity <strong>"{activity.title}"</strong>? 
                    This action cannot be undone.
                  </p>
                  <div className="d-flex justify-content-center">
                    <button
                      type="button"
                      className="btn btn-light me-3"
                      data-bs-dismiss="modal"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Deleting...
                        </>
                      ) : (
                        'Yes, Delete'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Activity Modal */}
    </>
  );
};

export default DeleteActivity; 