const express = require("express");
const mysql = require('mysql2');
const ejs = require('ejs');
const bodyParser = require("body-parser");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

const connection = mysql.createConnection({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password:'password',
    database: 'barbershop'
})

function findMostFrequentString(array) {
    const frequencyMap = {};

    // Count the frequency of each string
    for (let i = 0; i < array.length; i++) {
        const currentString = array[i];
        frequencyMap[currentString] = frequencyMap[currentString] ? frequencyMap[currentString] + 1 : 1;
    }

    let mostFrequentString = '';
    let maxFrequency = 0;

    // Find the most frequent string
    for (const string in frequencyMap) {
        if (frequencyMap[string] > maxFrequency) {
            mostFrequentString = string;
            maxFrequency = frequencyMap[string];
        }
    }

    return mostFrequentString;
}



app.get("/", (req, res)=>{
    res.render('login');
})

app.post('/login', (req, res) => {
    const { id, password } = req.body;

    // Query the database to check the user's credentials
    connection.query('SELECT cust_id, emp_id FROM user WHERE (cust_id = ? OR emp_id = ?) AND user_password = ?', [id, id, password], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).send('An unexpected error occurred.');
            return;
        }

        if (results.length === 0) {
            res.status(401).send('Invalid username or password.');
            return;
        }

        const user = results[0];
        if (user.cust_id) {
            connection.query('SELECT ser_name, ser_price FROM service', (err, results)=>{
                if (error) {
                    console.error('Error executing query:', error);
                    res.status(500).send('An unexpected error occurred.');
                }
                const services = results;
                res.render('customer', {services, custId: user.cust_id});
            })
        } else if (user.emp_id) {
            // Redirect to employee.ejs for employees
            res.redirect("/employee")
        }
    });
});

// Handle the reservation form submission
app.post('/reservation', (req, res) => {
    const { appDate, appTime, serName, custId } = req.body;

    // Retrieve the ser_id based on the selected ser_name
    connection.query('SELECT ser_id FROM service WHERE ser_name = ?', [serName], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).send('An unexpected error occurred.');
            return;
        }

        if (results.length === 0) {
            console.error('Service not found:', serName);
            res.status(400).send('Selected service is not available.');
            return;
        }

        const serId = results[0].ser_id;

        // Save the reservation to the appointment table
        connection.query('INSERT INTO appointment (app_date, app_time, ser_id, cust_id) VALUES (?, ?, ?, ?)', [appDate, appTime, serId, custId], (error) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).send('An unexpected error occurred.');
                return;
            }

            // Redirect to a success page or display a success message
            res.send('Reservation successfully made!');
        });
    });
});

// Get appointments for the employee page
app.get('/employee', function(req, res) {

    // Fetch the data from the service table
    connection.query('SELECT ser_id, ser_name, ser_price FROM service', function(error, serresults) {
        if (error) throw error;

        connection.query('SELECT cust_gender FROM customer', (err,result)=>{
            if (err) throw err;
            const gender = [];
            for (let i=0; i<result.length; i++){
                gender[i] = result[i].cust_gender;
            }
            mostgender = findMostFrequentString(gender);

            connection.query('SELECT cust_age FROM customer', (err, result)=>{
                if (err) throw err;
                ages = [];
                for (let i=0; i<result.length; i++){
                    ages[i] = result[i].cust_age;
                }
                const smallest = Math.min(...ages);
                const biggest = Math.max(...ages);

                connection.query('SELECT f_name, l_name FROM customer WHERE cust_age = ?', [smallest], (err, result)=>{
                    if (err) throw err;
                    const youngest = result[0].f_name+" "+result[0].l_name;

                    connection.query('SELECT f_name, l_name FROM customer WHERE cust_age = ?', [biggest], (err, result)=>{
                        if (err) throw err;
                        const oldest = result[0].f_name+" "+result[0].l_name;

                        function findMostFrequentNumber(array) {
                            const frequencyMap = {};
                            let maxFrequency = 0;

                            // Update frequency count for each number
                            array.forEach(number => {
                                frequencyMap[number] = (frequencyMap[number] || 0) + 1;
                                maxFrequency = Math.max(maxFrequency, frequencyMap[number]);
                            });

                            // Find the number(s) with the maximum frequency
                            const mostFrequentNumbers = [];
                            for (const number in frequencyMap) {
                                if (frequencyMap[number] === maxFrequency) {
                                    mostFrequentNumbers.push(Number(number));
                                }
                            }

                            return mostFrequentNumbers;
                        }

                        connection.query('SELECT ser_id FROM appointment', (err, result)=>{{
                            if (err) throw err;
                            serids = [];
                            for (let i = 0; i<result.length; i++){
                                serids[i] = result[i].ser_id;
                            }
                            const mostFrequentSerid = findMostFrequentNumber(serids);
                            connection.query('SELECT ser_name FROM service WHERE ser_id = ?', [mostFrequentSerid], (err, mostsername)=>{
                                if (err) throw err;

                                connection.query('SELECT appointment.app_id, appointment.app_date, appointment.app_time, service.ser_name, customer.f_name, customer.l_name, customer.cust_phone, customer.cust_gender, customer.cust_age FROM appointment INNER JOIN service ON appointment.ser_id = service.ser_id INNER JOIN customer ON appointment.cust_id = customer.cust_id', function(error, appointments) {
                                    if (error) throw error;

                                    // Retrieve customer data
                                    connection.query('SELECT cust_id, f_name, l_name, cust_phone, cust_gender, cust_age FROM customer', function(error, customers) {
                                        if (error) throw error;

                                        connection.query('SELECT emp_id, emp_f_name, emp_l_name, emp_phone, emp_gender, emp_salary, emp_role, emp_age FROM employee', (error, results) => {
                                            if (error) throw error;

                                            // Render the employee view and pass the employee data to it
                                            res.render('employee', { appointments: appointments, customers: customers , employees: results, mostser : mostsername[0].ser_name, oldest:oldest, youngest:youngest, mostgender:mostgender, services: serresults});
                                        });
                                    });
                                });
                            })
                        }})
                    })
                })
            })
        })

    });







});



app.post('/delete-appointment', function(req, res) {
    // Extract the app_id from the request body
    const app_id = req.body.app_id;

    // Perform the deletion of the appointment based on the app_id
    connection.query('DELETE FROM appointment WHERE app_id = ?', [app_id], function(error, results) {
        if (error) {
            console.error('Error deleting appointment:', error);
            // Handle the error appropriately (e.g., render an error page)
        } else {
            // Redirect to the employee page after successful deletion
            res.redirect('/employee');
        }
    });
});


// Add the following route handler after the existing routes
app.post('/revenue', function(req, res) {
    const selectedDate = req.body.selectedDate;
    const query = `SELECT SUM(service.ser_price) AS revenue FROM appointment JOIN service ON appointment.ser_id = service.ser_id WHERE appointment.app_date = ?`;
    connection.query(query, [selectedDate], function(err, results) {
        if (err) throw err;
        const revenue = results[0].revenue || 0;
        res.render('revenue', { revenue, selectedDate });
    });
});



// Add the following route handler after the existing routes
app.post('/appointments', function(req, res) {
    const selectedDate = req.body.selectedDate;
    const query = `SELECT COUNT(*) AS appointmentCount FROM appointment WHERE app_date = ?`;
    connection.query(query, [selectedDate], function(err, results) {
        if (err) throw err;
        const appointmentCount = results[0].appointmentCount || 0;
        res.render('appointments', { appointmentCount, selectedDate });
    });
});










app.listen(3000, () => {
    console.log('Server started on port 3000');
});
