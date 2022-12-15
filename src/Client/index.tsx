/* @refresh reload */
import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import './index.css';
import App from './App';
import {createSignal} from 'solid-js';

// use localstore to 
export const jwt_localstore_key = 'jwt_localstore'
export default createSignal(window.localStorage.getItem(jwt_localstore_key));


render(
    () => (
        <Router>
            <App />
        </Router>
    ),
    document.getElementById('root') as HTMLElement);
