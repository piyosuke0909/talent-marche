import type {
  User,
  Service,
  Order,
  Category,
  Request,
  Proposal,
  Review,
  Message,
} from '@prisma/client'

export type UserWithRelations = User & {
  services: Service[]
  orders: Order[]
  reviews: Review[]
  _count: {
    services: number
    orders: number
    reviews: number
  }
}

export type ServiceWithRelations = Service & {
  user: User
  category: Category
  reviews: Review[]
  _count: {
    orders: number
    reviews: number
    favorites: number
  }
}

export type OrderWithRelations = Order & {
  service?: Service
  seller: User
  buyer: User
  messages: Message[]
  reviews: Review[]
}

export type RequestWithRelations = Request & {
  user: User
  category: Category
  proposals: (Proposal & { user: User })[]
  _count: {
    proposals: number
  }
}

export type ReviewWithRelations = Review & {
  reviewer: User
  reviewee: User
  service?: Service
  order?: Order
}

export interface ServiceUserSummary {
  id: string
  username: string
  name: string | null
  image: string | null
}

export interface CategorySummary {
  id: string
  name: string
  slug: string
}

export interface ServiceListItem {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  deliveryDays: number
  user: ServiceUserSummary
  category: CategorySummary
  averageRating: number
  totalReviews: number
  orderCount: number
  favoriteCount: number
}

export interface ServicesResponse {
  services: ServiceListItem[]
  totalCount: number
  totalPages: number
  currentPage: number
}

export interface ServiceReviewSummary {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewer: ServiceUserSummary
}

export interface ServiceDetail extends ServiceListItem {
  tags: string[]
  isActive: boolean
  userId: string
  categoryId: string
  createdAt: string
  updatedAt: string
  user: ServiceUserSummary & {
    bio: string | null
    isVerified: boolean
    createdAt: string
  }
  reviews: ServiceReviewSummary[]
  _count: {
    orders: number
    reviews: number
    favorites: number
  }
}

export interface MessageUser extends ServiceUserSummary {
  bio?: string | null
}

export interface MessageSummary {
  id: string
  content: string
  createdAt: string
  isRead: boolean
  senderId: string
  receiverId: string
  order?: MessageOrderSummary | null
}

export interface ConversationPreview {
  userId: string
  user: MessageUser
  lastMessage: MessageSummary | null
  unreadCount: number
  updatedAt: string
}

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

export interface MessageOrderSummary {
  id: string
  status: OrderStatus
  service: {
    id: string
    title: string
  } | null
}

export interface ConversationMessage extends MessageSummary {
  sender: MessageUser
  receiver: MessageUser
  order: MessageOrderSummary | null
}

export interface ConversationsResponse {
  conversations: ConversationPreview[]
}

export interface MessagesResponse {
  messages: ConversationMessage[]
  nextCursor?: string | null
}

export interface SearchParams {
  q?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  deliveryTime?: number
  rating?: number
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
}

export interface DashboardStats {
  totalEarnings: number
  activeOrders: number
  completedOrders: number
  averageRating: number
  totalServices: number
  totalReviews: number
}
