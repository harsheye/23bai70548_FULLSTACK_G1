class Person { 
constructor(name, age) { 
this.name = name; 
this.age = age; 
} 
showInfo() { 
console.log(`Name: ${this.name}`); 
console.log(`Age: ${this.age}`); 
} 
} 
class Student extends Person { 
constructor(name, age, course) { 
super(name, age);  
this.course = course; 
} 
showInfo() { 
super.showInfo(); 
console.log(`Course: ${this.course}`); 
} 
} 
class Teacher extends Person { 
constructor(name, age, subject) { 
super(name, age); 
this.subject = subject; 
} 
showInfo() { 
super.showInfo(); 
console.log(`Subject: ${this.subject}`); 
} 
} 
const p=new Person('Sanjay Kumar',34); 
const s = new Student("Rohit Kumar", 21, "Computer Science"); 
const t = new Teacher("Dr Raman", 45, "Full Stack Development"); 
console.log('Person Infomation =>') 
p.showInfo(); 
console.log('Student Infomation =>') 
s.showInfo(); 
console.log('Teacher Infomation =>') 
t.showInfo();