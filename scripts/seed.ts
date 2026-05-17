//import { sequelize } from '../src/config/db';
//import { UserModel } from '../src/models/User';
//import { Merchant } from '../src/models/Merchant';
//import { Transaction } from '../src/models/Transaction';
//import bcrypt from 'bcryptjs';

//const seed = async () => {
//    try {
//        await sequelize.sync({ force: true });
//        console.log(' Database synced');

//        const hashedPassword = await bcrypt.hash('password123', 10);

//        const user = await UserModel.create({
//            name: 'Demo User',
//            email: 'demo@example.com',
//            password: hashedPassword,
//            role: 'merchant',
//        });

//        const merchant = await Merchant.create({
//            name: 'Demo Merchant',
//            userId: user.id,
//        });

//        await Transaction.bulkCreate([
//            { merchantId: merchant.id, amount: 100.0, status: 'completed' },
//            { merchantId: merchant.id, amount: 50.0, status: 'pending' },
//            { merchantId: merchant.id, amount: 200.0, status: 'failed' },
//        ]);

//        console.log(' Database seeded successfully!');
//        process.exit(0);
//    } catch (err) {
//        console.error(' Error seeding database:', err);
//        process.exit(1);
//    }
//};

//seed();


//// scripts/seed.ts
//import 'dotenv/config';
//import { sequelize } from '../src/config/db';
//import User from '../src/models/User';
//import Merchant from '../src/models/Merchant';
//import Transaction from '../src/models/Transaction';
//import * as bcrypt from 'bcryptjs'; // <-- use namespace import

//async function seed() {
//    try {
//        await sequelize.sync({ force: true });
//        console.log('✅ Database synced');

//        const hashed = await bcrypt.hash('password123', 10);

//        const user = await User.create({
//            email: 'demo@example.com',
//            password: 'password123',   // will be hashed by hook into password_hash
//            role: 'merchant',
//        });

//        const merchant = await Merchant.create({
//            name: 'Demo Merchant',
//            userId: user.id,
//            cac_number: 'CAC123456',
//            account_number: '0123456789',
//            bank_name: 'Zenith Bank',
//            status: 'approved',
//        });

//        await Transaction.bulkCreate([
//            { merchantId: merchant.id, amount: 100.0, status: 'completed', reference: 'TXN100' },
//            { merchantId: merchant.id, amount: 50.0, status: 'pending', reference: 'TXN050' },
//            { merchantId: merchant.id, amount: 200.0, status: 'failed', reference: 'TXN200' },
//        ]);

//        console.log('🌱 Seed completed');
//        process.exit(0);
//    } catch (e) {
//        console.error('❌ Seed failed', e);
//        process.exit(1);
//    }
//}

//seed();
