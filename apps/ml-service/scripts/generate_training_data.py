#!/usr/bin/env python3
"""
Generate large-scale training data for transaction auto-categorization.
Produces 10K-15K multilingual samples across 10 categories.
"""

import json
import csv
import random
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_PATH = DATA_DIR / "augmented_samples.csv"
BOOTSTRAP_PATH = DATA_DIR / "bootstrap_merchants.json"

CATEGORIES = [
    "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
    "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
]

CATEGORY_DATA = {
    "Food & Drink": {
        "merchants": [
            "Starbucks", "McDonald's", "Chipotle", "Subway", "Domino's", "Pizza Hut",
            "Taco Bell", "Panera Bread", "Dunkin'", "Wendy's", "KFC", "Burger King",
            "Popeyes", "Chick-fil-A", "Panda Express", "Five Guys", "Shake Shack",
            "In-N-Out", "Sonic", "Arby's", "Jack in the Box", "Hardee's",
            "Whole Foods", "Trader Joe's", "Kroger", "Costco", "Walmart",
            "Safeway", "Publix", "H-E-B", "Aldi", "Lidl", "Tesco", "Sainsbury's",
            "Starbucks Reserve", "Peet's Coffee", "Dutch Bros", "Tim Hortons",
            "The Cheesecake Factory", "Olive Garden", "Red Lobster", "Outback",
            "Texas Roadhouse", "Longhorn Steakhouse", "TGI Friday's",
            "Applebee's", "Chili's", "Buffalo Wild Wings", "Dave & Buster's",
            "P.F. Chang's", "Rainforest Cafe", "Hard Rock Cafe",
            "Sweetgreen", "Cava", "Pret A Manger", "Chipotle",
            "Nando's", "Wagamama", "Yo! Sushi", "Dishoom",
            "Wetherspoons", "Greggs", "Costa Coffee", "Caffe Nero",
            "Denny's", "IHOP", "Cracker Barrel", "Bob Evans",
            "Zaxby's", "Raising Cane's", "Wingstop", "Papa John's",
            "Little Caesars", "Marco's Pizza", "Papa Murphy's",
            "Krispy Kreme", "Nothing Bundt Cakes", "Insomnia Cookies",
            "Baskin-Robbins", "Dairy Queen", "Cold Stone", "Ben & Jerry's",
            "Sweet Tomatoes", "Souplantation", "Golden Corral",
            "Moe's Southwest Grill", "Qdoba", "Del Taco", "Carl's Jr.",
            "Smoothie King", "Jamba Juice", "Tropical Smoothie",
            "Grubhub Order", "DoorDash Order", "Uber Eats Order",
            "Postmates Order", "Instacart Grocery",
            "Biryani Palace", "Tandoori Nights", "Curry House", "Naan Stop",
            "Ramen Ichiran", "Tonkotsu Ramen", "Sushi Zanmai", "Genki Sushi",
            "Pho Hoa", "Bun Bo Hue", "Pad Thai Kitchen", "Thai Basil",
            "La Taqueria", "El Pollo Loco", "Chipotle Mexican Grill",
            "The Halal Guys", "Shake Shack", "In-N-Out Burger",
            "Grocery Store", "Food Market", "Farmers Market", "Bakery",
            "Deli", "Butcher Shop", "Seafood Market", "Wine Shop",
            "Coffee Shop", "Tea House", "Juice Bar", "Smoothie Bar",
            "Pizza Place", "Sushi Bar", "Taco Stand", "Noodle Shop",
        ],
        "descriptions": [
            "Lunch", "Dinner", "Breakfast", "Coffee", "Takeout", "Delivery",
            "Quick bite", "Snack", "Brunch", "Meal", "Groceries", "Food",
            "Latte", "Cappuccino", "Espresso", "Iced Coffee", "Frappuccino",
            "Burger", "Fries", "Chicken", "Sandwich", "Wrap", "Salad",
            "Sushi", "Ramen", "Pasta", "Pizza", "Taco", "Burrito",
            "Bowl", "Steak", "Seafood", "Dessert", "Cake", "Ice cream",
            "Smoothie", "Juice", "Tea", "Water", "Soda", "Milkshake",
            "Wine", "Beer", "Cocktail", "Alcohol", "Happy hour",
            "Grocery run", "Weekly groceries", "Fresh produce", "Deli order",
            "Family meal", "Date night", "Business lunch", "Catering order",
            "Drive-through", "Counter service", "Buffet", "All-you-can-eat",
            "Morning coffee", "Afternoon tea", "Late night snack",
            "Weekend brunch", "Holiday dinner", "Birthday cake",
        ],
        "receipt_patterns": [
            "PURCHASE AUTHORIZED {merchant} {amount}",
            "{merchant} STORE #{store_id} PURCHASE",
            "DEBIT CARD PURCHASE {merchant}",
            "POS PURCHASE {merchant} {city}",
            "ONLINE PURCHASE {merchant}.COM",
            "{merchant} SUBSCRIPTION RENEWAL",
            "CARD {card_num} PURCHASE {merchant}",
            "UBER EATS *{merchant} PURCHASE",
            "DOORDASH *{merchant} PURCHASE",
        ],
    },
    "Shopping": {
        "merchants": [
            "Amazon", "Walmart", "Target", "Best Buy", "Nike", "Macy's",
            "eBay", "Etsy", "H&M", "Zara", "IKEA", "Home Depot", "Lowe's",
            "Nordstrom", "Bloomingdale's", "Saks Fifth Avenue", "Neiman Marcus",
            "TJ Maxx", "Marshalls", "Ross Stores", "Burlington", "TJX",
            "Costco", "Sam's Club", "BJ's Wholesale",
            "Apple Store", "Samsung Store", "Microsoft Store", "Google Store",
            "B&H Photo", "Newegg", "Micro Center", "GameStop",
            "Adidas", "Puma", "Under Armour", "New Balance", "Reebok",
            "Gucci", "Louis Vuitton", "Prada", "Chanel", "Dior",
            "Coach", "Michael Kors", "Kate Spade", "Tiffany & Co",
            "Walgreens", "CVS", "Rite Aid", "Dollar General", "Dollar Tree",
            "Five Below", "Ocean State Job Lot", "Big Lots",
            "Wayfair", "Overstock", "Ashley Furniture", "Pottery Barn",
            "West Elm", "Crate & Barrel", "Restoration Hardware",
            "Best Buy", "Micro Center", "GameStop", "Steam",
            "HomeGoods", "At Home", "Hobby Lobby", "Michaels", "JOANN",
            "PetSmart", "Petco", "Pet Supplies Plus",
            "Bass Pro Shops", "Cabela's", "REI", "Dick's Sporting Goods",
            "Ulta Beauty", "Sephora", "Bath & Body Works",
            "T-Mobile Store", "Verizon Store", "AT&T Store",
            "Samsung", "Apple", "Dell", "HP", "Lenovo", "ASUS",
            "Barnes & Noble", "Half Price Books", "Books-A-Million",
            "Micro Center", "Central Computer", "Fry's Electronics",
            "AliExpress", "Temu", "Shein", "Wish", "Banggood",
            "Flipkart", "Myntra", "JioMart", "Nykaa",
            "Mercado Libre", "Zalando", "ASOS", "Boohoo",
            "Online Shopping", "E-commerce Purchase", "Marketplace Order",
            "Retail Purchase", "Department Store", "Specialty Store",
        ],
        "descriptions": [
            "Online shopping", "Clothing", "Electronics", "Home decor",
            "Retail", "Purchase", "Apparel", "Accessories", "Footwear",
            "Gadgets", "Furniture", "Kitchenware", "Toys", "Books",
            "Beauty products", "Skincare", "Makeup", "Fragrance",
            "Sports equipment", "Outdoor gear", "Camping", "Hiking",
            "Pet supplies", "Garden supplies", "Tools", "Hardware",
            "Office supplies", "School supplies", "Art supplies",
            "Gift", "Birthday gift", "Holiday gift", "Wedding gift",
            "Baby items", "Maternity", "Kids clothing", "Toddler",
            "Subscription box", "Monthly box", "Quarterly box",
            "Digital purchase", "App purchase", "In-app purchase",
            "Game purchase", "DLC", "Microtransaction",
            "Phone case", "Charger", "Cable", "Adapter", "Headphones",
            "Speaker", "Keyboard", "Mouse", "Monitor", "Printer",
            "Clothes", "Jeans", "T-shirt", "Jacket", "Coat", "Dress",
            "Shoes", "Sneakers", "Boots", "Sandals", "Slippers",
            "Hat", "Scarf", "Gloves", "Belt", "Sunglasses", "Watch",
            "Necklace", "Ring", "Earrings", "Bracelet", "Jewelry",
        ],
        "receipt_patterns": [
            "AMAZON.COM PURCHASE {amount}",
            "TARGET T-{store_id} PURCHASE",
            "BEST BUY #{store_id} {city}",
            "WAL-MART SUPERCENTER #{store_id}",
            "NIKE.COM ORDER PURCHASE",
            "APPLE STORE PURCHASE {amount}",
            "ONLINE ORDER {merchant}",
            "DEBIT PURCHASE {merchant}",
        ],
    },
    "Transport": {
        "merchants": [
            "Uber", "Lyft", "Shell", "Exxon", "BP", "Chevron",
            "Amtrak", "Greyhound", "Delta Airlines", "United Airlines",
            "American Airlines", "Southwest Airlines", "JetBlue", "Spirit",
            "Frontier", "Alaska Airlines", "Hawaiian Airlines",
            "British Airways", "Lufthansa", "Air France", "Emirates",
            "Qatar Airways", "Singapore Airlines", "Cathay Pacific",
            "Enterprise Rent-A-Car", "Hertz", "Avis", "Budget",
            "National Car Rental", "Alamo", "Dollar Rental", "Thrifty",
            "Metro", "Transit Authority", "City Bus", "Public Transit",
            "Taxi", "Yellow Cab", "Black Cab", "Radio Cab",
            "ParkWhiz", "SpotHero", "Parking", "Parking Meter",
            "Toll", "E-ZPass", "SunPass", "FasTrak",
            "Gas Station", "Fuel", "BP Pulse", "ChargePoint",
            "Shell Recharge", "EVgo", "Electrify America", "Tesla Supercharger",
            "Zipcar", "Car2Go", "Lime", "Bird", "Spin",
            "Ola", "Grab", "Gojek", "Bolt", "Freenow", "BlaBlaCar",
            "Trainline", "Omio", "Rail Europe", "Amtrak",
            "Indian Railways", "IRCTC", "Deutsche Bahn", "SNCF",
            "RedBus", "Greyhound", "Megabus", "FlixBus",
            "Flight", "Airline Ticket", "Airport", "Baggage Fee",
            "Car Rental", "Rental Car", "Lease Payment",
            "Auto Insurance", "Car Wash", "Auto Repair",
            "Mechanic", "Oil Change", "Tire Shop", "Brake Service",
            "Roadside Assistance", "AAA", "Jump Start",
            "Parking Garage", "Valet Parking", "Airport Parking",
            "Metro Card", "Transit Pass", "Monthly Pass",
            "Ride Share", "Carpool", "Vanpool",
        ],
        "descriptions": [
            "Ride share", "Gas", "Fuel", "Train ticket", "Bus fare",
            "Flight ticket", "Flight", "Parking fee", "Metro pass",
            "Cab fare", "Taxi", "Uber", "Lyft", "Toll",
            "Airport shuttle", "Airport transfer", "Long distance ride",
            "Daily commute", "Monthly transit", "Annual pass",
            "Car rental", "Vehicle lease", "Auto payment",
            "Gas fill-up", "Diesel", "Premium gas", "Regular gas",
            "Charging", "EV charging", "Supercharger",
            "Airline ticket", "Round trip", "One way", "First class",
            "Economy class", "Business class", "Checked bag", "Carry-on",
            "Seat upgrade", "In-flight meal", "Airport lounge",
            "Highway toll", "Bridge toll", "Express lane",
            "Parking daily", "Parking weekly", "Street parking",
            "Car wash", "Detailing", "Oil change", "Tire rotation",
            "Brake pads", "Alignment", "Inspection", "Registration",
        ],
        "receipt_patterns": [
            "UBER *TRIP {amount}",
            "LYFT RIDES {amount}",
            "SHELL OIL {city} #{store_id}",
            "EXXON MOBIL #{store_id}",
            "DELTA AIR LINES {amount}",
            "UNITED AIRLINES {amount}",
            "METRO TRANSIT {amount}",
            "PARKING {location} {amount}",
        ],
    },
    "Bills & Utilities": {
        "merchants": [
            "Verizon", "AT&T", "T-Mobile", "Sprint", "Comcast", "Xfinity",
            "PG&E", "Duke Energy", "Con Edison", "National Grid",
            "State Farm", "Allstate", "Geico", "Progressive", "USAA",
            "Liberty Mutual", "Nationwide", "Travelers", "MetLife",
            "Water Company", "Sewer District", "Waste Management",
            "Republic Services", "AT&T", "Charter", "Cox Communications",
            "Spectrum", "FiOS", "CenturyLink", "Frontier Communications",
            "Direct Energy", "Reliant Energy", "TXU Energy", "Green Mountain Energy",
            "ADT", "SimpliSafe", "Ring", "Vivint", "Brinks",
            "Gmail", "Google Workspace", "Microsoft 365", "Adobe Creative Cloud",
            "iCloud", "Dropbox", "OneDrive", "Box",
            "Netflix", "Spotify", "Disney+", "Hulu", "HBO Max",
            "Amazon Prime", "Apple Music", "YouTube Premium",
            "Gym Membership", "Planet Fitness", "LA Fitness", "Gold's Gym",
            "CrossFit", "Yoga Studio", "Peloton",
            "Home Security", "Cable Bill", "Internet Bill", "Phone Bill",
            "Electric Bill", "Gas Bill", "Water Bill", "Sewer Bill",
            "Trash Pickup", "Recycling", "HOA Dues", "Condo Fees",
            "Insurance Premium", "Life Insurance", "Health Insurance",
            "Auto Insurance", "Home Insurance", "Renters Insurance",
            "Child Support", "Alimony", "Court Payment",
            "Tax Payment", "Property Tax", "City Tax", "County Tax",
            "Phone plan", "Data plan", "Family plan", "Prepaid plan",
        ],
        "descriptions": [
            "Phone bill", "Internet", "Electric bill", "Utility bill",
            "Insurance", "Water bill", "Gas bill", "Monthly fee",
            "Subscription", "Cable", "Broadband", "Fiber",
            "Monthly premium", "Annual premium", "Deductible",
            "Auto-pay", "Recurring charge", "Standing order",
            "Direct debit", "autopay", "monthly charge",
            "Wireless service", "Mobile plan", "Family plan",
            "Security system", "Monitoring fee", "Installation fee",
            "Cloud storage", "Software subscription", "Service fee",
            "Maintenance fee", "Service charge", "Administrative fee",
            "Processing fee", "Convenience fee", "Late fee",
            "Interest charge", "Finance charge", "Overdue payment",
        ],
        "receipt_patterns": [
            "AUTOPAY VERIZON WIRELESS {amount}",
            "COMCAST CABLE {amount}",
            "PG&E ELECTRIC {amount}",
            "STATE FARM INS {amount}",
            "GEICO PAYMENT {amount}",
            "T-MOBILE AUTOPAY {amount}",
            "DIRECT DEBIT {merchant} {amount}",
            "RECURRING PAYMENT {merchant}",
        ],
    },
    "Entertainment": {
        "merchants": [
            "Netflix", "Spotify", "Disney+", "HBO Max", "Hulu",
            "AMC Theatres", "Regal Cinemas", "Cinemark",
            "Steam", "PlayStation Store", "Xbox Store", "Nintendo eShop",
            "Apple Music", "YouTube Premium", "YouTube TV",
            "Twitch", "TikTok", "Instagram", "Snapchat",
            "Concert", "Live Nation", "Ticketmaster", "StubHub",
            "Vivid Seats", "SeatGeek", "AXS",
            "Barnes & Noble", "Audible", "Kindle", "Comixology",
            "Duolingo", "Babbel", "Rosetta Stone",
            "Apple TV+", "Paramount+", "Peacock", "Discovery+",
            "Crunchyroll", "Funimation", "VRV",
            "iHeartRadio", "Pandora", "SoundCloud", "Tidal",
            "Deezer", "Amazon Music", "YouTube Music",
            "Comedy Club", "Stand-up Show", "Improv",
            "Bowling", "Mini Golf", "Go-Karts", "Escape Room",
            "Arcade", "Laser Tag", "Paintball",
            "Museum", "Art Gallery", "Zoo", "Aquarium",
            "Theme Park", "Amusement Park", "Water Park",
            "Circus", "Broadway", "West End", "Opera",
            "Karaoke", "Dance Club", "Nightclub",
            "Board Game Cafe", "Card Game", "D&D Session",
            "Casino", "Poker Night", "Betting", "Lottery",
            "Sports Event", "Game Ticket", "Season Pass",
            "Gym", "Fitness Class", "Personal Trainer", "Yoga",
            "Spa Day", "Massage", "Sauna",
            "Hobby", "Craft supplies", "Model building",
            "Photography", "Camera equipment", "Drone",
            "Gaming subscription", "Game pass", "EA Play",
            "Xbox Game Pass", "PlayStation Plus", "Nintendo Online",
            "Movie rental", "Pay-per-view", "VOD",
            "Streaming service", "Content subscription",
            "Music album", "Concert ticket", "Festival pass",
        ],
        "descriptions": [
            "Streaming subscription", "Music streaming", "Movie ticket",
            "Video games", "Game purchase", "Music", "Premium subscription",
            "Live music", "Play", "Concert", "Theatre",
            "Monthly subscription", "Annual plan", "Family plan",
            "Pay-per-view", "Rental", "Digital purchase",
            "In-game purchase", "Season pass", "Battle pass",
            "DLC", "Expansion", "Add-on content",
            "Movie", "Film", "Documentary", "Series",
            "Podcast", "Audiobook", "E-book",
            "Live show", "Comedy show", "Open mic",
            "Theme park", "Fair", "Festival",
            "Museum visit", "Gallery exhibition", "Art show",
            "Bowling night", "Game night", "Karaoke night",
            "Spa treatment", "Facial", "Manicure", "Pedicure",
            "Gym membership", "Fitness class", "Training session",
            "Meditation app", "Wellness subscription",
        ],
        "receipt_patterns": [
            "NETFLIX.COM {amount}",
            "SPOTIFY USA {amount}",
            "STEAM PURCHASE {amount}",
            "PLAYSTATION STORE {amount}",
            "XBOX LIVE {amount}",
            "AMC THEATRES {location} {amount}",
            "TICKETMASTER {amount}",
            "LIVE NATION {amount}",
        ],
    },
    "Healthcare": {
        "merchants": [
            "CVS Pharmacy", "Walgreens", "Rite Aid", "Walmart Pharmacy",
            "Kaiser Permanente", "Mayo Clinic", "Cleveland Clinic",
            "Johns Hopkins", "Mount Sinai", "Cedars-Sinai",
            "Dental Associates", "Aspen Dental", "Heartland Dental",
            "Vision Center", "LensCrafters", "Sears Optical",
            "MinuteClinic", "CityMD", "Urgent Care", "CareNow",
            "Quest Diagnostics", "LabCorp", "BioReference",
            "Radiology Associates", "Imaging Center",
            "Planned Parenthood", "Women's Health Center",
            "Physical Therapy", "Rehab Associates", "Sport Rehab",
            "Mental Health", "Counseling Center", "Therapy Session",
            "Psychiatrist", "Psychologist", "Life Coach",
            "Veterinarian", "Vet Clinic", "Pet Hospital",
            "Animal Hospital", "Pet Emergency", "PetCare",
            "Doctor", "Dentist", "Dermatologist", "Cardiologist",
            "Optometrist", "Ophthalmologist", "Pediatrician",
            "OB/GYN", "Urologist", "Orthopedist", "Neurologist",
            "Hospital", "Clinic", "Medical Center", "Health Center",
            "Pharmacy", "Drugstore", "Medicine", "Prescription",
            "Supplement", "Vitamins", "First Aid",
            "Medical bill", "Lab work", "Blood test", "X-ray",
            "MRI", "CT scan", "Ultrasound", "Surgery",
            "Ambulance", "Emergency room", "ER visit",
            "Medical equipment", "Wheelchair", "Crutches",
            "Health insurance copay", "Deductible payment",
        ],
        "descriptions": [
            "Prescription", "Doctor visit", "Medical", "Dental checkup",
            "Eye exam", "Medical visit", "Dental cleaning", "Medical bill",
            "Pharmacy", "Medicine", "Vitamins", "Supplement",
            "Lab results", "Blood work", "Imaging", "X-ray",
            "Therapy", "Counseling", "Psychiatry",
            "Surgery", "Procedure", "Treatment",
            "Vaccination", "Flu shot", "COVID vaccine",
            "Annual checkup", "Physical exam", "Wellness visit",
            "Specialist visit", "Follow-up", "Consultation",
            "Urgent care", "Emergency", "Hospital stay",
            "Medical supplies", "CPAP supplies", "Diabetic supplies",
            "Pet vet visit", "Pet medication", "Pet surgery",
            "Dental work", "Root canal", "Crown", "Filling", "Extraction",
            "Glasses", "Contacts", "LASIK",
            "Braces", "Orthodontist", "Retainer",
        ],
        "receipt_patterns": [
            "CVS PHARMACY #{store_id} {amount}",
            "WALGREENS #{store_id} {amount}",
            "KAISER PERMANENTE {amount}",
            "QUEST DIAGNOSTICS {amount}",
            "DENTAL ASSOCIATES {amount}",
            "PHARMACY PURCHASE {amount}",
            "MEDICAL CENTER {amount}",
            "HOSPITAL BILL {amount}",
        ],
    },
    "Education": {
        "merchants": [
            "Coursera", "Udemy", "Khan Academy", "Duolingo", "Skillshare",
            "Harvard Extension", "MIT OpenCourseWare", "Stanford Online",
            "Community College", "University", "College", "School",
            "Book Store", "Chegg", "Textbook Store",
            "Pluralsight", "LinkedIn Learning", "Skillsoft",
            "Codecademy", "freeCodeCamp", "DataCamp", "LeetCode",
            "Brilliant", "MasterClass", "CreativeLive",
            "Treehouse", "Udacity", "edX", "FutureLearn",
            "Coursera Plus", "Google Career Certificates",
            "AWS Training", "Azure Certification", "GCP Training",
            "CompTIA", "Cisco Learning", "Microsoft Learn",
            "Tutor", "Tutoring Center", "Kumon", "Sylvan Learning",
            "Test Prep", "Kaplan", "Princeton Review", "Barron's",
            "SAT Prep", "GRE Prep", "GMAT Prep", "LSAT Prep",
            "Language School", "Berlitz", "Alliance Française",
            "Goethe Institut", "Instituto Cervantes",
            "Music School", "Piano Lessons", "Guitar Lessons",
            "Art School", "Dance Classes", "Cooking Classes",
            "Coding Bootcamp", "Flatiron School", "General Assembly",
            "App Academy", "Hack Reactor", "Lambda School",
            "Trade School", "Vocational Training", "Apprenticeship",
            "Professional Development", "Continuing Education",
            "Workshop", "Seminar", "Conference", "Training Course",
            "Certification Program", "License Renewal",
            "School Supplies", "Notebooks", "Stationery",
        ],
        "descriptions": [
            "Online course", "Learning", "Language learning", "Online learning",
            "Tuition", "Tuition payment", "Tuition fee", "Books",
            "Course", "Workshop", "Certification",
            "Monthly subscription", "Annual plan", "Lifetime access",
            "Certificate program", "Degree program", "Diploma",
            "Textbook", "Study material", "Practice exam",
            "Lab fee", "Technology fee", "Student fee",
            "Registration fee", "Enrollment", "Application fee",
            "Student loan", "Loan payment", "Financial aid",
            "Scholarship", "Grant", "Fellowship",
            "Piano lesson", "Guitar lesson", "Voice lesson",
            "Dance class", "Art class", "Cooking class",
            "Swimming lesson", "Martial arts", "Yoga class",
            "Coding bootcamp", "Tech course", "Data science course",
            "Language class", "English class", "Spanish class",
            "SAT prep", "Test preparation", "Study guide",
        ],
        "receipt_patterns": [
            "COURSERA PURCHASE {amount}",
            "UDEMY COURSE {amount}",
            "UNIVERSITY TUITION {amount}",
            "BOOK STORE {amount}",
            "CHEGG STUDY {amount}",
            "SKILLSHARE {amount}",
            "PLURALSIGHT {amount}",
            "SCHOOL PAYMENT {amount}",
        ],
    },
    "Housing": {
        "merchants": [
            "Property Management Co.", "Rent Payment", "Home Depot",
            "Lowe's", "Ace Hardware", "Apartment", "Mortgage",
            "Lease", "Property Tax", "Zillow", "Realtor.com",
            "Redfin", "Trulia", "Apartments.com",
            "Craigslist Housing", "Facebook Marketplace Housing",
            "Airbnb", "VRBO", "Booking.com",
            "TaskRabbit", "Thumbtack", "Angi", "HomeAdvisor",
            "Molly Maid", "Merry Maids", "Maid Brigade",
            "Terminix", "Orkin", "Rentokil", "Pest Control",
            "Plumber", "Electrician", "HVAC", "Contractor",
            "Handyman", "Landscaping", "Lawn Care", "Snow Removal",
            "Pool Service", "Cleaning Service", "Junk Removal",
            "Storage Unit", "Public Storage", "CubeSmart", "Extra Space",
            "Moving Company", "U-Haul", "Penske", "Budget Truck",
            "Home Warranty", "American Home Shield", "First American",
            "Pest Control", "Termite Treatment", "Mosquito Control",
            "HOA Payment", "Condo Fee", "Building Maintenance",
            "Locksmith", "Garage Door", "Window Repair",
            "Roofing", "Plumbing", "Electrical", "Painting",
            "Flooring", "Carpet", "Tile", "Hardwood",
            "Security System", "Smart Home", "Ring Doorbell",
            "Nest", "Ecobee", "Smart Lock",
            "Furniture Store", "Appliance Store", "Mattress Store",
            "Craigslist", "Facebook Marketplace",
        ],
        "descriptions": [
            "Rent", "Monthly rent", "Repair", "Maintenance",
            "Repair supplies", "Monthly mortgage", "Lease payment",
            "Tax payment", "HOA fee", "Property tax",
            "Home insurance", "Home warranty", "Pest control",
            "Cleaning", "Maid service", "Deep clean",
            "Landscaping", "Lawn mowing", "Garden",
            "Plumber", "Electrician", "Contractor", "Handyman",
            "Storage", "Moving", "Packing", "Shipping",
            "Furniture", "Appliance", "Mattress", "Decor",
            "Home improvement", "Renovation", "Remodel",
            "Paint", "Flooring", "Roofing", "Windows",
            "Smart home", "Security", "Camera system",
            "Airbnb stay", "Hotel", "Vacation rental",
            "Utility deposit", "Security deposit", "Move-in fee",
        ],
        "receipt_patterns": [
            "RENT PAYMENT {amount}",
            "MORTGAGE PAYMENT {amount}",
            "HOME DEPOT #{store_id} {amount}",
            "LOWES #{store_id} {amount}",
            "PROPERTY TAX {amount}",
            "HOA DUES {amount}",
            "MAINTENANCE {merchant} {amount}",
            "HOME DEPOT.COM {amount}",
        ],
    },
    "Income": {
        "merchants": [
            "Employer Inc.", "Freelance Client", "Bank of America",
            "Vanguard", "Fidelity", "Charles Schwab", "E*Trade",
            "Robinhood", "Coinbase", "Binance", "Crypto Exchange",
            "Airbnb", "PayPal", "Venmo", "Zelle", "Cash App",
            "Upwork", "Fiverr", "Toptal", "Freelancer.com",
            "Etsy", "Shopify", "WooCommerce", "Squarespace",
            "Side Gig", "Investment", "Tax Return", "Refund",
            "IRS", "State Tax Refund", "Federal Refund",
            "Employer Payroll", "Direct Deposit", "Paycheck",
            "ADP Payroll", "Gusto Payroll", "Paychex",
            "Bonus", "Commission", "Overtime Pay",
            "Severance", "Retirement Distribution", "401k Distribution",
            "Pension", "Social Security", "SSDI", "Disability",
            "Rental Income", "Dividend Payment", "Interest Payment",
            "Capital Gains", "Stock Sale", "Bond Maturity",
            "Lottery Winnings", "Prize Money", "Settlement",
            "Gift Money", "Inheritance", "Trust Distribution",
            "Cash Back", "Rewards", "Rebate", "Refund",
            "Sale Proceeds", "Garage Sale", "Yard Sale",
            "Freelance Payment", "Consulting Fee", "Retainer",
            "Royalty Payment", "License Fee", "Intellectual Property",
            "Tip", "Gratuity", "Bonus Payment",
        ],
        "descriptions": [
            "Monthly salary", "Freelance payment", "Interest payment",
            "Dividend payment", "Rental income", "Online sale",
            "Contract work", "Gig payment", "Shop earnings",
            "Freelance work", "Capital gains", "Annual tax refund",
            "Refund", "Paycheck", "Direct deposit", "Bonus",
            "Commission", "Overtime", "Holiday pay",
            "Side hustle", "Gig economy", "Part-time work",
            "Consulting", "Advisory", "Coaching",
            "Royalties", "Licensing", "Patent income",
            "Investment return", "Stock dividend", "Bond interest",
            "Rental property", "Airbnb income", "Sublease",
            "Tax refund", "IRS refund", "State refund",
            "Cash back reward", "Points redemption", "Rebate check",
            "Insurance payout", "Claim settlement", "Settlement check",
            "Gift card redemption", "Prize", "Award",
            "Donation received", "Crowdfunding", "GoFundMe",
        ],
        "receipt_patterns": [
            "DIRECT DEPOSIT PAYROLL {amount}",
            "ACH CREDIT {employer}",
            "IRS TREAS 310 TAX REF",
            "STATE TREASURY REFUND",
            "VENMO CASHOUT {amount}",
            "PAYPAL TRANSFER {amount}",
            "STOCK SALE {ticker} {amount}",
            "DIVIDEND {ticker} {amount}",
        ],
    },
    "Other": {
        "merchants": [
            "Miscellaneous", "Various", "Retail Store", "Subscription Service",
            "Government", "DMV", "Post Office", "USPS", "UPS", "FedEx",
            "DHL", "TNT", "Amazon Locker", "P.O. Box",
            "Bank Fee", "ATM Fee", "Overdraft Fee", "Wire Transfer Fee",
            "Western Union", "MoneyGram", "Remittance",
            "Charity", "Donation", "GoFundMe", "Red Cross",
            "United Way", "Salvation Army", "Habitat for Humanity",
            "Church", "Temple", "Mosque", "Religious Organization",
            "Civic", "Community Center", "Town Hall",
            "Storage", "Self Storage", "Warehouse",
            "Laundromat", "Dry Cleaners", "Tailor",
            "Printing", "Copy Shop", "FedEx Office",
            "Notary", "Legal Services", "Attorney", "Lawyer",
            "Accountant", "CPA", "Tax Preparer",
            "Pet Store", "Grooming", "Dog Walking", "Pet Boarding",
            "Daycare", "Babysitter", "Nanny", "Childcare",
            "Parking", "Toll", "Fine", "Penalty",
            "Late Fee", "Service Charge", "Convenience Fee",
            "Gift Card", "Prepaid Card", "Voucher",
            "Pawn Shop", "Thrift Store", "Consignment",
            "Casino", "Bet", "Gambling", "Lottery Ticket",
            "Florist", "Flower Shop", "Plant Store",
        ],
        "descriptions": [
            "Misc purchase", "Other expense", "Daily purchase",
            "Monthly subscription", "Miscellaneous", "General expense",
            "Various", "Other", "Uncategorized", "Unknown",
            "Shipping", "Delivery", "Postage", "Handling",
            "Bank fee", "ATM", "Wire", "Transfer",
            "Donation", "Charity", "Contribution", "Tithe",
            "Legal fee", "Consultation", "Retainer",
            "Accounting", "Tax prep", "Filing fee",
            "Pet care", "Grooming", "Boarding", "Kennel",
            "Childcare", "Daycare", "Babysitting",
            "Laundry", "Dry cleaning", "Pressing",
            "Printing", "Copying", "Scanning", "Faxing",
            "Notary", "Stamp", "Certification",
            "Storage rental", "Unit rental", "Locker",
            "Gift card purchase", "Prepaid load", "Top-up",
            "Fine payment", "Penalty", "Infraction",
            "Lost item", "Replacement", "Damage payment",
        ],
        "receipt_patterns": [
            "MISC PURCHASE {amount}",
            "BANK FEE {amount}",
            "ATM WITHDRAWAL FEE",
            "WESTERN UNION {amount}",
            "USPS POSTAGE {amount}",
            "UPS SHIPPING {amount}",
            "FEDEx SHIPPING {amount}",
            "GOVERNMENT PAYMENT {amount}",
        ],
    },
}

# Multilingual translations for descriptions
TRANSLATIONS = {
    "Food & Drink": {
        "es": ["comida", "restaurante", "café", "almuerzo", "cena", "desayuno", "comestibles", "tienda de conveniencia"],
        "fr": ["nourriture", "restaurant", "café", "déjeuner", "dîner", "petit-déjeuner", "épicerie"],
        "de": ["essen", "restaurant", "kaffee", "mittagessen", "abendessen", "frühstück", "lebensmittel"],
        "hi": ["खाना", "रेस्तरां", "कॉफी", "दोपहर का भोजन", "रात का खाना", "नाश्ता", "किराने का सामान"],
        "ja": ["食事", "レストラン", "コーヒー", "ランチ", "ディナー", "朝食", "食料品"],
        "zh": ["食品", "餐厅", "咖啡", "午餐", "晚餐", "早餐", "杂货"],
        "ko": ["음식", "레스토랑", "커피", "점심", "저녁", "아침", "식료품"],
        "ar": ["طعام", "مطعم", "قهوة", "غداء", "عشاء", "فطور", "بقالة"],
        "pt": ["comida", "restaurante", "café", "almoço", "jantar", "café da manhã", "merceria"],
        "ru": ["еда", "ресторан", "кофе", "обед", "ужин", "завтрак", "продукты"],
    },
    "Shopping": {
        "es": ["compras", "tienda", "ropa", "electrónica", "hogar"],
        "fr": ["shopping", "magasin", "vêtements", "électronique", "maison"],
        "de": ["einkaufen", "geschäft", "kleidung", "elektronik", "zuhause"],
        "hi": ["खरीदारी", "दुकान", "कपड़े", "इलेक्ट्रॉनिक्स", "घर"],
        "ja": ["ショッピング", "買い物", "衣類", "電子機器", "ホーム"],
        "zh": ["购物", "商店", "服装", "电子产品", "家居"],
        "ko": ["쇼핑", "가게", "옷", "전자제품", "홈"],
        "ar": ["تسوق", "متجر", "ملابس", "إلكترونيات", "منزل"],
        "pt": ["compras", "loja", "roupas", "eletrônicos", "casa"],
        "ru": ["покупки", "магазин", "одежда", "электроника", "дом"],
    },
    "Transport": {
        "es": ["transporte", "gasolina", "viaje", "taxi", "avión"],
        "fr": ["transport", "essence", "voyage", "taxi", "avion"],
        "de": ["transport", "benzin", "reise", "taxi", "flugzeug"],
        "hi": ["परिवहन", "ईंधन", "यात्रा", "टैक्सी", "हवाई जहाज"],
        "ja": ["交通", "燃料", "旅行", "タクシー", "飛行機"],
        "zh": ["交通", "燃料", "旅行", "出租车", "飞机"],
        "ko": ["교통", "연료", "여행", "택시", "비행기"],
        "ar": ["نقل", "وقود", "سفر", "تاكسي", "طائرة"],
        "pt": ["transporte", "combustível", "viagem", "táxi", "avião"],
        "ru": ["транспорт", "топливо", "поездка", "такси", "самолет"],
    },
    "Bills & Utilities": {
        "es": ["facturas", "servicios", "utilidades", "seguro", "suscripción"],
        "fr": ["factures", "services", "utilitaires", "assurance", "abonnement"],
        "de": ["rechnungen", "versorgung", "nebenkosten", "versicherung", "abonnement"],
        "hi": ["बिल", "उपयोगिताएँ", "बीमा", "सदस्यता"],
        "ja": ["請求書", "公共料金", "保険", "サブスクリプション"],
        "zh": ["账单", "公用事业", "保险", "订阅"],
        "ko": ["청구서", "공과금", "보험", "구독"],
        "ar": ["فواتير", "مرافق", "تأمين", "اشتراك"],
        "pt": ["contas", "serviços", "seguro", "assinatura"],
        "ru": ["счета", "коммунальные", "страховка", "подписка"],
    },
    "Entertainment": {
        "es": ["entretenimiento", "cine", "música", "juegos", "streaming"],
        "fr": ["divertissement", "cinéma", "musique", "jeux", "streaming"],
        "de": ["unterhaltung", "kino", "musik", "spiele", "streaming"],
        "hi": ["मनोरंजन", "सिनेमा", "संगीत", "खेल", "स्ट्रीमिंग"],
        "ja": ["エンターテイメント", "映画", "音楽", "ゲーム", "ストリーミング"],
        "zh": ["娱乐", "电影", "音乐", "游戏", "流媒体"],
        "ko": ["엔터테인먼트", "영화", "음악", "게임", "스트리밍"],
        "ar": ["ترفيه", "سينما", "موسيقى", "ألعاب", "بث"],
        "pt": ["entretenimento", "cinema", "música", "jogos", "streaming"],
        "ru": ["развлечения", "кино", "музыка", "игры", "стриминг"],
    },
    "Healthcare": {
        "es": ["salud", "médico", "farmacia", "dentista", "hospital"],
        "fr": ["santé", "médical", "pharmacie", "dentiste", "hôpital"],
        "de": ["gesundheit", "medizinisch", "apotheke", "zahnarzt", "krankenhaus"],
        "hi": ["स्वास्थ्य", "चिकित्सा", "फार्मेसी", "दंत चिकित्सक", "अस्पताल"],
        "ja": ["ヘルスケア", "医療", "薬局", "歯科", "病院"],
        "zh": ["医疗", "医药", "药房", "牙科", "医院"],
        "ko": ["건강", "의료", "약국", "치과", "병원"],
        "ar": ["صحة", "طبي", "صيدلية", "أسنان", "مستشفى"],
        "pt": ["saúde", "médico", "farmácia", "dentista", "hospital"],
        "ru": ["здоровье", "медицина", "аптека", "стоматология", "больница"],
    },
    "Education": {
        "es": ["educación", "curso", "escuela", "universidad", "libros"],
        "fr": ["éducation", "cours", "école", "université", "livres"],
        "de": ["bildung", "kurs", "schule", "universität", "bücher"],
        "hi": ["शिक्षा", "पाठ्यक्रम", "विद्यालय", "विश्वविद्यालय", "पुस्तकें"],
        "ja": ["教育", "コース", "学校", "大学", "本"],
        "zh": ["教育", "课程", "学校", "大学", "书籍"],
        "ko": ["교육", "강좌", "학교", "대학교", "도서"],
        "ar": ["تعليم", "دورة", "مدرسة", "جامعة", "كتب"],
        "pt": ["educação", "curso", "escola", "universidade", "livros"],
        "ru": ["образование", "курс", "школа", "университет", "книги"],
    },
    "Housing": {
        "es": ["vivienda", "alquiler", "hipoteca", "reparación", "hogar"],
        "fr": ["logement", "loyer", "hypothèque", "réparation", "maison"],
        "de": ["wohnung", "miete", "hypothek", "reparatur", "zuhause"],
        "hi": ["आवास", "किराया", "बंधक", "मरम्मत", "घर"],
        "ja": ["住宅", "家賃", "ローン", "修理", "ホーム"],
        "zh": ["住房", "租金", "抵押贷款", "修理", "家"],
        "ko": ["주택", "임대", "주택담보대출", "수리", "홈"],
        "ar": ["سكن", "إيجار", "رهن عقاري", "إصلاح", "منزل"],
        "pt": ["moradia", "aluguel", "hipoteca", "reparo", "casa"],
        "ru": ["жилье", "аренда", "ипотека", "ремонт", "дом"],
    },
    "Income": {
        "es": ["ingresos", "salario", "pago", "devolución", "reembolso"],
        "fr": ["revenu", "salaire", "paiement", "remboursement"],
        "de": ["einkommen", "gehalt", "zahlung", "erstattung"],
        "hi": ["आय", "वेतन", "भुगतान", "वापसी"],
        "ja": ["収入", "給与", "支払い", "返金"],
        "zh": ["收入", "工资", "付款", "退款"],
        "ko": ["수입", "급여", "지급", "환급"],
        "ar": ["دخل", "راتب", "دفعة", "استرداد"],
        "pt": ["renda", "salário", "pagamento", "reembolso"],
        "ru": ["доход", "зарплата", "оплата", "возврат"],
    },
    "Other": {
        "es": ["otros", "varios", "general", "misceláneos"],
        "fr": ["autres", "divers", "général", "divers"],
        "de": ["andere", "sonstiges", "allgemein", "verschiedenes"],
        "hi": ["अन्य", "विविध", "सामान्य", "विभिन्न"],
        "ja": ["その他", "雑多", "一般", " various"],
        "zh": ["其他", "杂项", "一般", "各种"],
        "ko": ["기타", "잡다", "일반", "各種"],
        "ar": ["أخرى", "متنوع", "عام", "مختلف"],
        "pt": ["outros", "diversos", "geral", "vários"],
        "ru": ["прочее", "разное", "общее", "различные"],
    },
}


def generate_receipt_text(merchant: str, amount: float, pattern: str, store_id: int = None, city: str = None) -> str:
    """Generate realistic receipt/bank statement text."""
    card_num = f"{''.join([str(random.randint(0,9)) for _ in range(4)])}"
    store_id = store_id or random.randint(1000, 9999)
    city = city or random.choice(["NEW YORK", "LOS ANGELES", "CHICAGO", "HOUSTON", "PHOENIX",
                                   "LONDON", "BERLIN", "TOKYO", "MUMBAI", "PARIS", "TORONTO",
                                   "SYDNEY", "SINGAPORE", "DUBAI", "SEOUL", "SAO PAULO"])

    text = pattern.format(
        merchant=merchant,
        amount=f"${amount:.2f}",
        store_id=store_id,
        card_num=card_num,
        city=city,
        location=city,
        ticker=merchant[:4].upper(),
        employer=merchant,
    )
    return text


def generate_amount(category: str) -> float:
    """Generate realistic amounts for each category."""
    ranges = {
        "Food & Drink": (3.0, 85.0),
        "Shopping": (5.0, 500.0),
        "Transport": (5.0, 800.0),
        "Bills & Utilities": (20.0, 350.0),
        "Entertainment": (5.0, 200.0),
        "Healthcare": (10.0, 1500.0),
        "Education": (15.0, 2000.0),
        "Housing": (500.0, 3000.0),
        "Income": (100.0, 10000.0),
        "Other": (1.0, 200.0),
    }
    low, high = ranges.get(category, (5.0, 100.0))
    return round(random.uniform(low, high), 2)


def generate_samples(category: str, count: int) -> list[dict]:
    """Generate diverse samples for a category."""
    data = CATEGORY_DATA[category]
    samples = []

    for _ in range(count):
        merchant = random.choice(data["merchants"])
        description = random.choice(data["descriptions"])

        # Sometimes add description variations
        variant = random.random()
        if variant < 0.2:
            # Just merchant
            text = merchant
            desc = ""
        elif variant < 0.5:
            # Merchant + description
            text = merchant
            desc = description
        elif variant < 0.7:
            # Receipt-style text
            amount = generate_amount(category)
            pattern = random.choice(data["receipt_patterns"])
            text = generate_receipt_text(merchant, amount, pattern)
            desc = ""
        elif variant < 0.85:
            # Multilingual description
            lang_data = TRANSLATIONS.get(category, {})
            lang = random.choice(list(lang_data.keys()))
            ml_desc = random.choice(lang_data[lang])
            text = merchant
            desc = ml_desc
        else:
            # Mixed: receipt text + description
            amount = generate_amount(category)
            pattern = random.choice(data["receipt_patterns"])
            receipt = generate_receipt_text(merchant, amount, pattern)
            text = f"{receipt} {description}"
            desc = ""

        samples.append({
            "merchant": text,
            "description": desc,
            "category": category,
        })

    return samples


def main():
    print("=" * 60)
    print("FinBrain Training Data Generator")
    print("=" * 60)

    all_samples = []

    # Load bootstrap data
    if BOOTSTRAP_PATH.exists():
        with open(BOOTSTRAP_PATH) as f:
            data = json.load(f)
        all_samples.extend(data["samples"])
        print(f"Loaded {len(data['samples'])} bootstrap samples")

    # Generate per-category samples (balanced)
    target_per_category = 1200  # ~12K total across 10 categories
    for category in CATEGORIES:
        samples = generate_samples(category, target_per_category)
        all_samples.extend(samples)
        print(f"  {category}: {len(samples)} generated")

    # Shuffle
    random.shuffle(all_samples)

    # Deduplicate
    seen = set()
    unique_samples = []
    for s in all_samples:
        key = (s["merchant"].lower().strip(), s["description"].lower().strip(), s["category"])
        if key not in seen:
            seen.add(key)
            unique_samples.append(s)

    print(f"\nTotal samples: {len(all_samples)}")
    print(f"After dedup: {len(unique_samples)}")

    # Category distribution
    print("\nCategory distribution:")
    for cat in sorted(CATEGORIES):
        count = sum(1 for s in unique_samples if s["category"] == cat)
        print(f"  {cat}: {count}")

    # Write output
    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["merchant", "description", "category"])
        writer.writeheader()
        writer.writerows(unique_samples)

    print(f"\nWritten to {OUTPUT_PATH}")
    print(f"File size: {OUTPUT_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
