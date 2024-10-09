const express = require("express");
const User = require("../models/user");
const Book = require("../models/book");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const DeletedBook = require("../models/deletedBooks")

const router = express.Router();


// ........................... Signup Loging Apis ................................................

router.post("/signup", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    console.log(JSON.stringify({message: "signup request..", data: {username, role}}));
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    console.log(JSON.stringify({message: "signup successful..", data: {username, role}}));
    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.log(JSON.stringify({message: "signup failed..", username, message : error.message}));
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log(JSON.stringify({message: "login request..", username}));
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User Not Found" });
    if (user.status === "DELETED") return res.status(400).json({ message: "user is already deleted" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(400).json({ message: "Invalid Password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log(JSON.stringify({message: "login succesful..", username}));

    res.json({ 
      success: true,
      message: "Logged In Successfully",
      data : {
        token,
        role: user.role
      }
     });
  } catch (error) {
    console.log(JSON.stringify({message: "login failed..", message :error.message}));
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// .................................Books Crud .............................................................

router.post("/books", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  try {
    const { title, author } = req.body;
    const book = new Book({ title, author });
    await book.save();
    res.status(201).json({ 
      success : true,
      message: "Book added",
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured while adding Book", 
      error: error.message 
    });
  }
});

router.get("/books", auth, checkRole(["LIBRARIAN", "MEMBER"]), async (req, res) => {
  try {
    const books = await Book.find();
    res.status(201).json({
      success : true,
      message: "All Books",
      data: books
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured getting books", 
      error: error.message 
    });
  }
});

router.get("/books/:id", auth, checkRole(["LIBRARIAN", "MEMBER"]), async (req, res) => {
  try {
    const books = await Book.findById(req.params.id);
    res.status(201).json({
      success : true,
      message: "book featched successfully",
      data: books
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured getting book data of id " + req.params.id, 
      error: error.message 
    });
  }
});

router.put("/books/:id", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  try {
    const { title, author } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { title, author });
    res.json({ 
      success : true,
      message: "Book updated" 
    });
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Boook updation failed", 
      error: error.message 
    });
  }
});

router.delete("/books/:id", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
    try {
      const book = await Book.findById(req.params.id, {_id : 0});
      if(!book) throw new Error("Book not found");
      if(book.status === 'BORROWED') throw new Error("Book already borrowed by someone else") 


      const bookData = book.toObject();
      const deletedBookData = new DeletedBook({...bookData, deletedBy: req.user.id});
      await deletedBookData.save();

      await Book.findByIdAndDelete(req.params.id)

      res.status(200).json({
        success : true,
        message: "Book deleted successfully"
      })
    } catch (error) {
      res.status(500).json({ 
        success : false,
        message: "Error accured while deleting Book", 
        error: error.message 
      });
    }
});


// .................................User crud ............................................................

router.post('/users', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { username, password, role } = req.body;
  
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ 
      success: true,
      message: 'User added' 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to add user", 
      error: error.message 
    });
  }
});

router.put("/users/:id", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  const userId = req.params.id;
  const { name, role, currentPassword, newPassword } = req.body;
  try {
    const updateData = {
      name,
      role,
    };

    if (currentPassword && newPassword) {
      // Fetch the user from the database
      const user = await User.findById(userId);

      if (!user) throw new Error("User not found");

      // Verify the current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash the new password before saving
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.json({
      success: true,
      message: "User updated",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "unable to update user",
      error: error.message,
    });
  }
});

router.delete('/users/:id', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.booksBorrowed.length > 0) {
      const borrowedBooks = await Book.find({ _id: { $in: user.booksBorrowed } });

      for (const book of borrowedBooks) {
        book.status = 'AVAILABLE';
        await book.save();
      }

      user.booksReturned.push(...user.booksBorrowed);
      user.booksBorrowed = []; 
    }
    user.status = 'DELETED';
    user.deletedBy = req.user.id
    await user.save();

    res.json({ 
      success: true,
      message: 'Account deleted' 
    });   
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to delete user", 
      error: error.message 
    });
  }
});

router.delete('/delete-account', auth, checkRole(['MEMBER']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.booksBorrowed.length > 0) {
      const borrowedBooks = await Book.find({ _id: { $in: user.booksBorrowed } });

      for (const book of borrowedBooks) {
        book.status = 'AVAILABLE';
        await book.save();
      }

      user.booksReturned.push(...user.booksBorrowed);
      user.booksBorrowed = []; 
    }
    user.status = 'DELETED';
    user.deletedBy = "SELF";
    await user.save();
    res.json({ 
      success: true,
      message: 'Account deleted' 
    });   
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to delete user", 
      error: error.message 
    });
  }
});

router.get('/users', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const users = await User.find({status : "ACTIVE"});
    res.json({
      success: true,
      message: "Users fetched successfully", 
      data : users
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to fetch user", 
      error: error.message 
    });
  }
});

router.get('/users/:id', auth, checkRole(['MEMBER', 'LIBRARIAN']), async (req, res) => {
  try {
    const user = await User.findOne({_id : req.params.id, status : "ACTIVE" });
    if (!user)
      return res.status(404).json({ message: "User not found" });
  
    res.json({
      success: true,
      message: "User fetched successfully", 
      data : user
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to fetch user", 
      error: error.message 
    });
  }
})


// .................................Borrowing & Returning ............................................................

router.post("/borrow/:id", auth, checkRole(["MEMBER"]), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || book.status !== "AVAILABLE")
      return res.status(400).json({ message: "Book not available" });
  
    book.status = "BORROWED";
    await book.save();
  
    const member = await User.findById(req.user.id);
    member.booksBorrowed.push(book._id);
    await member.save();
  
    res.json({ 
      success: true,
      message: "Book borrowed" 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "book borrowed failed" , 
      error: error.message 
    });
  }
});

router.post("/return/:id", auth, checkRole(["MEMBER"]), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || book.status !== "BORROWED")
      return res.status(400).json({ message: "Book not borrowed" });
  
    book.status = "AVAILABLE";
    await book.save();
  
    const member = await User.findById(req.user.id);
  
    const bookBorrowedIndex = member.booksBorrowed.indexOf(book._id);
    if (bookBorrowedIndex === -1) {
      return res.status(400).json({ message: "Book not borrowed by this user" });
    }
  
    member.booksBorrowed.pull(book._id);
    member.booksReturned.push(book._id);
    await member.save();
  
    res.json({ 
      success: true,
      message: "Book returned" 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Book returned error", 
      error: error.message 
    });
  }
});

// router.get("/history", auth, checkRole(["MEMBER"]), async (req, res) => {
//   const member = await User.findById(req.user.id).populate("booksBorrowed");
//   res.json(member.booksBorrowed);
// });


module.exports = router;
