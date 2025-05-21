import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import React from 'react';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {function} props.onConfirm
 * @param {function} props.onCancel
 * @param {string} [props.confirmText]
 * @param {string} [props.cancelText]
 * @param {('info'|'warning'|'danger')} [props.variant] - Controls icon and color
 */
function ConfirmDialog({
    open,
    title = 'Confirm',
    message = '',
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
}) {
    let Icon = InfoOutlinedIcon;
    let iconColor = 'var(--accent)';
    if (variant === 'danger' || confirmText.toLowerCase().includes('delete') || confirmText.toLowerCase().includes('clear')) {
        Icon = WarningAmberIcon;
        iconColor = 'var(--danger-button-bg)';
    } else if (variant === 'warning') {
        Icon = WarningAmberIcon;
        iconColor = 'var(--warning)';
    }

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            PaperProps={{
                style: {
                    background: 'var(--section-bg)',
                    color: 'var(--text-color)',
                    borderRadius: 12,
                    minWidth: 340,
                },
            }}
        >
            <DialogTitle id="confirm-dialog-title" style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon style={{ fontSize: 36, color: iconColor, flexShrink: 0 }} />
                <span>{title}</span>
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description" style={{ color: 'var(--text-color)', fontSize: 17, lineHeight: 1.6, marginTop: 8 }}>
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} style={{ color: 'var(--danger-button-bg)' }}>{cancelText}</Button>
                <Button onClick={onConfirm} style={{ color: iconColor }} autoFocus>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmDialog; 