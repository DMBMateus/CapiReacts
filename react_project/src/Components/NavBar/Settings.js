import { useContext } from 'react';
import { ThemeContext } from '../App';
import { Switch, FormControlLabel } from '@mui/material';

function Settings() {
    const { mode, toggleTheme } = useContext(ThemeContext);

    return (
        <div>
            <h1>Settings</h1>
            <FormControlLabel
                label={`${mode === 'light' ? 'Light' : 'Dark'} Mode`}
                control={
                    <Switch
                        checked={mode === 'dark'}
                        onChange={toggleTheme}
                    />
                }
            />
        </div>
    );
}

export default Settings;