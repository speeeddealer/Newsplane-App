const Joi = require('joi');

const registerValidation = (user) => {
    const schema = Joi.object({
        firstName: Joi.string().label('First name').required().min(2).max(100),
        lastName: Joi.string().label('Last name').required().min(2).max(100),
        username: Joi.string().label('Username').required().min(6).max(25),
        email: Joi.string().label('E-mail').required().email(),
        password: Joi.string().label('Password').required().min(6).max(1024),
        confirmPassword: Joi.any().equal(Joi.ref('password')).required().label('Confirm password').options({messages: {'any.only': '{{#label}} must match password'}})
    });
    return schema.validate(user);
}

const loginValidation = (user) => {
    const schema = Joi.object({
        email: Joi.string().label('E-mail').required().email(),
        password: Joi.string().label('Password').required().min(6).max(1024)
    });
    return schema.validate(user);
}

const updateValidation = (user) => {
    const schema = Joi.object({
        firstName: Joi.string().label('First name').optional().min(2).max(100),
        lastName: Joi.string().label('Last name').optional().min(2).max(100),
        username: Joi.string().label('Username').optional().min(6).max(25),
        email: Joi.string().label('E-mail').optional().email(),
        password: Joi.string().label('Password').allow('').min(6).max(1024)
    });
    return schema.validate(user);
}

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
module.exports.updateValidation = updateValidation;