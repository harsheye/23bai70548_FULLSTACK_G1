import React, { useState } from 'react'; 
import './App.css'; 
 
function App() { 
 
  var booksArray=[ 
    { title: '1984', author: 'George Orwell' }, 
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' }, 
    { title: 'To Kill a Mockingbird', author: 'Harper Lee' } 
  ];   
 
  const [books, setBooks] = useState(booksArray); 
 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [newTitle, setNewTitle] = useState(''); 
  const [newAuthor, setNewAuthor] = useState(''); 
 
  const handleAddBook = () => { 
    if (newTitle.trim() && newAuthor.trim()) { 
      setBooks([...books, { title: newTitle, author: newAuthor }]); 
      setNewTitle(''); 
      setNewAuthor(''); 
    } 
  }; 
 
  const handleRemoveBook = (indexToRemove) => { 
    setBooks(books.filter((book, index) => index !== indexToRemove)); 
  }; 
 
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) 
  );
  return ( 
    <div className="library-container"> 
      <h2 className="library-title">Library Management</h2> 
 
      <input 
        type="text" 
        className="search-input" 
        placeholder="Search by title or author" 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
      /> 
 
      <div className="add-book-form"> 
        <input 
          type="text" 
          className="input-field" 
          placeholder="New book title" 
          value={newTitle} 
          onChange={(e) => setNewTitle(e.target.value)} 
        /> 
        <input 
          type="text" 
          className="input-field" 
          placeholder="New book author" 
          value={newAuthor} 
          onChange={(e) => setNewAuthor(e.target.value)} 
        /> 
        <button className="add-button" onClick={handleAddBook}>Add 
Book</button> 
      </div> 
 
      {filteredBooks.map((book, index) => ( 
        <div key={index} className="book-item"> 
          <span> 
            <strong>{book.title}</strong> by {book.author} 
          </span> 
          <button className="remove-button" onClick={() => 
handleRemoveBook(index)}>Remove</button> 
        </div> 
      ))} 
    </div> 
  ); 
} 
 
export default App;