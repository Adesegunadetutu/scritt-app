export type Profile = {
id: string;
full_name: string | null;
school: string | null;
phone: string | null;
avatar_url: string | null;
role: 'user' | 'admin';
created_at: string;
updated_at: string;
};
12     
export type Listing = {
id: string;
user_id: string;
title: string;
description: string;
price: number;
category: string | null;
images: string[];
location: string | null;
is_sold: boolean;
verified: boolean;
created_at: string;
updated_at: string;
};
27     
export type Favorite = {
user_id: string;
listing_id: string;
created_at: string;
};
