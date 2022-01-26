const status = require('http-status');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const salt = bcrypt.genSaltSync(10);
const User = require('../models/User.js').User



module.exports = function (app) {
    app.post('/api/register', [check('username').isLength({ min: 5 }), check('password').isLength({ min: 6 }),
    check('email').isEmail()], async function (req, res) {

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(status.UNPROCESSABLE_ENTITY).json({ errors: errors.array() })
        }
        const user = new User();
        user.email = req.body.email;
        user.username = req.body.username;

        var hash = bcrypt.hashSync(req.body.password, salt);
        user.password = hash;

        try {
            const result = await user.save()

            return res.status(status.OK).json(result)

        }
        catch (err) {
            if (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ errors: err })
            }

        }
    })


    app.post('/api/login', [check('password').isLength({ min: 6 })], function (req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(status.UNPROCESSABLE_ENTITY).json({ errors: errors.array() })
        }

        const email = req.body.email;
        const password = req.body.password;
                
        if (!email || !password) {
            return res.status(status.UNAUTHORIZED).json({ message: "Wrong Username or Password" })
        }



        User.findOne({email:email}, (err, user) => {
            if (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ err: err })
            }
            else if (!user) {
                return res.status(status.UNAUTHORIZED).json({ message: "Wrong Username or Password" });
            }
            else {
                const check = bcrypt.compareSync(password, user.password);
                if (check) {
                    jwt.sign({ user }, 'muhatacece', (err, token) => {
                        if (err) {
                            return res.status(status.UNPROCESSABLE_ENTITY).json({ err: err });
                        }
                        return res.status(status.OK).json({ token, user })
                    })
                }
                else {
                    return res.status(status.UNAUTHORIZED).json({ err: "Wrong Username or Password" })
                }

            }
        })
    })
}