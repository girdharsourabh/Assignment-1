function validateOrder (req, res, next) {
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    if(!customer_id || isNaN(customer_id)) {
        return res.status(400).json({ 
            error: "Invalid customer_id" 
        });
    }

    if(!product_id || isNaN(product_id)) {
        return res.status(400).json({ 
            error: "Invalid product_id" 
        });
    }

    if(!quantity || quantity <= 0) {
        return res.status(400).json({ 
            error: "Quantity must be greater than 0" 
        });
    }

    if (!shipping_address || shipping_address.trim().length === 0) {
        return res.status(400).json({ 
            error: "Shipping address required" 
        });
    }

    next();
};

module.exports = validateOrder;