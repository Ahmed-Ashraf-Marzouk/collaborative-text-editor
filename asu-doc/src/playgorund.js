

import React, { useCallback, useEffect, useState, useRef } from 'react'
import Quill from 'quill'
import QuillCursors from 'quill-cursors';
import "quill/dist/quill.snow.css"
import {io} from 'socket.io-client'
import { useParams } from 'react-router-dom'

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

Quill.register("modules/cursors", QuillCursors);

// Constant to simulate a high-latency connection when sending cursor
// position updates.
const CURSOR_LATENCY = 1000;
let randomColor = Math.floor((Math.random()+0.1)*16000000).toString(16);
let randomColorCode = `#${randomColor}`

// Constant to simulate a high-latency connection when sending
// text changes.
const TEXT_LATENCY = 500;


const colors = ["#5551FF", "#0FA958"];

const getUserColor = (index) => colors[index % colors.length];

let q = ''


export default function TextEditor() {
  const {id: documentId} = useParams()
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  
  
  // const [user, setUser] = useState(null);
  // const [doc, setDoc] = useState(null);
  // const [presences, setPresences] = useState({});
  // const [error, setError] = useState(null);
  // const connectedRef = useRef(false);
  // const editorRef = useRef(null);
  // const mousePointerRef = useRef(null);
  const editorCursorRef = useRef(null);
  
useEffect(()=>{
    
    // A Yjs document holds the shared data
    const ydoc = new Y.Doc()

    // Define a shared text type on the document
    const ytext = ydoc.getText('quill')
  
    // "Bind" the quill editor to a Yjs text type.
    const binding = new QuillBinding(ytext, q, provider.awareness)
  
  
},[])
  
  // Connect to server at port 3001
  useEffect(()=>{
    const s = io("http://localhost:3001")
    setSocket(s)

    return() =>{
      s.disconnect()
    }
  },[])


  useEffect(()=>{
    if (socket == null || quill == null) return

    const interval = setInterval(()=>{
      socket.emit('save-document', quill.getContents())

    }, SAVE_INTERVAL_MS)

    return() =>{
      clearInterval(interval)
    }
  },[socket, quill])

  useEffect(()=>{
    if (socket == null || quill == null) return

    socket.once("load-document",document=>{
      quill.setContents(document)
      quill.enable()
    })
    socket.emit('get-document', documentId)

  },[socket, quill, documentId])




  useEffect(()=>{
    if(socket == null || quill == null) return; 
    const handler = (delta) =>{
      quill.updateContents(delta)
    }
    socket.on('receive-changes',handler )

    return () =>{
      socket.off('receive-changes', handler)
    }
  }, [socket, quill])

  useEffect(()=>{
    if(socket == null || quill == null) return; 
    const handler = (delta, oldDelta, source) =>{
      if (source !== 'user') return; 
      // console.log("inside" + delta)
      socket.emit("send-changes", delta)
    }
    quill.on('text-change',handler )

    return () =>{
      quill.off('text-change', handler)
    }
  }, [socket, quill])

  

  useEffect(() =>{

    const cursorsOne = q.getModule('cursors');
    console.log(cursorsOne)
 
    cursorsOne.createCursor('cursor', 'User', randomColorCode);
    q.on('selection-change', selectionChangeHandler(cursorsOne));


  }, [socket, quill])

  // useCallback function take wrapper as parameter 
  // It waits until wrapperRef is defined in the return 
  // statement below. 
  const wrapperRef = useCallback(wrapper=>{
    if (wrapper == null) return // if there is no wrapper return.
    wrapper.innerHTML = ''; // clear the wrapper. 
    const txt = document.createElement('div') // create div element. 
    wrapper.append(txt) // append it to the wrapper.

    /*-------- Quill --------*/
    // create Quill object mapped to txt.
    q = new Quill(txt, {theme:"snow",  modules: { 
      cursors: {transformOnTextChange: true},toolbar: TOOLBAR_OPTIONS }})

    q.disable()
    q.setText("Loading...")
    setQuill(q)
  },[])


  return (
    // Our text editor! 
    <div id='txt' ref={wrapperRef}></div> 
  );

  
}


function selectionChangeHandler(cursors) {
  const debouncedUpdate = debounce(updateCursor, 500);

  return function(range, oldRange, source) {
    if (source === 'user') {
      // If the user has manually updated their selection, send this change
      // immediately, because a user update is important, and should be
      // sent as soon as possible for a smooth experience.
      updateCursor(range);
    } else {
      // Otherwise, it's a text change update or similar. These changes will
      // automatically get transformed by the receiving client without latency.
      // If we try to keep sending updates, then this will undo the low-latency
      // transformation already performed, which we don't want to do. Instead,
      // add a debounce so that we only send the update once the user has stopped
      // typing, which ensures we send the most up-to-date position (which should
      // hopefully match what the receiving client already thinks is the cursor
      // position anyway).
      debouncedUpdate(range);
    }
  };

  function updateCursor(range) {
    // Use a timeout to simulate a high latency connection.
    setTimeout(() => cursors.moveCursor('cursor', range), CURSOR_LATENCY);
  }
}


function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}