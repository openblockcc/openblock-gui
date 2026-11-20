import React, {useState} from 'react';

import {forgetAll} from '../../beginner-studio/domain/cloudSecrets';
import {errorText, iotApi} from '../../lib/iot-api';
import {Banner, Button, Card, inputStyle, useTheme} from '../ui.jsx';

const AccountPage = ({state, actions}) => {
    const K = useTheme();
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const [confirm, setConfirm] = useState('');
    const user = state.config.user || {};

    const exportData = async () => {
        setBusy('export');
        setError('');
        try {
            const data = await iotApi.exportMe();
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tinkerbit-cloud-${new Date().toISOString()
                .slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy('');
        }
    };

    const deleteAll = async () => {
        setBusy('delete');
        setError('');
        try {
            await iotApi.deleteMe();
            forgetAll(user.email);
            setConfirm('');
            setDone('All your Cloud boards and data were deleted.');
            actions.refreshAll();
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy('');
        }
    };

    return (
        <div style={{display: 'grid', gap: 12}}>
            <h1 style={{fontFamily: K.fontDisplay, fontSize: 28, margin: 0}}>Data and privacy</h1>
            {error ? <Banner tone="error">{error}</Banner> : null}
            {done ? <Banner tone="ok">{done}</Banner> : null}
            <Card>
                <div style={{fontSize: 14, color: K.sub, lineHeight: 1.6}}>
                    Signed in as <b>{user.email || 'unknown'}</b>. Readings are kept in full detail for 2 days, then as
                    minute averages for 30 days and hourly averages for a year. Each board keeps its last 100 alerts. WiFi passwords never reach our servers.
                    {' '}<a href="/privacy" style={{color: K.accent}}>Privacy</a>
                </div>
            </Card>
            <Card>
                <div style={{fontWeight: 800, marginBottom: 8}}>Download everything</div>
                <Button disabled={busy === 'export'} onClick={exportData}>{busy === 'export' ? 'Preparing…' : 'Download my data (JSON)'}</Button>
            </Card>
            <Card style={{borderColor: K.red}}>
                <div style={{fontWeight: 800, marginBottom: 6, color: K.red}}>Delete all Cloud data</div>
                <div style={{fontSize: 12, color: K.dim, marginBottom: 10}}>
                    Deletes every board, reading, dashboard and alert. Boards stop connecting. Type DELETE to confirm.
                </div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    <input
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        aria-label="Type DELETE to confirm"
                        style={Object.assign(inputStyle(K), {width: 160})}
                    />
                    <Button kind="danger" disabled={busy === 'delete' || confirm !== 'DELETE'} onClick={deleteAll}>
                        Delete everything
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default AccountPage;
