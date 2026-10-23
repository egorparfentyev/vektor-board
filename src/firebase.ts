import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {getStorage,connectStorageEmulator} from 'firebase/storage';
const e=import.meta.env;
export const pdfUploadsEnabled=e.VITE_PDF_UPLOADS==='true';
export const configured=!!e.VITE_FIREBASE_API_KEY&&!!e.VITE_FIREBASE_PROJECT_ID;
const app=initializeApp({apiKey:e.VITE_FIREBASE_API_KEY||'demo-key',authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,projectId:e.VITE_FIREBASE_PROJECT_ID||'demo-vektor',storageBucket:e.VITE_FIREBASE_STORAGE_BUCKET,appId:e.VITE_FIREBASE_APP_ID});
export const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
if(e.DEV&&e.VITE_FIREBASE_EMULATORS==='true'){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);connectStorageEmulator(storage,'127.0.0.1',9199)}
