
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { angry, meh, smile } from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  rating: 'positive' | 'neutral' | 'negative';
  platform: 'google' | 'tripadvisor' | 'internal';
  comment: string;
  date: string;
  responseStatus?: 'pending' | 'responded';
}

interface ReviewsListProps {
  reviews: Review[];
}

const ReviewsList = ({ reviews }: ReviewsListProps) => {
  const [filteredReviews, setFilteredReviews] = useState<Review[]>(reviews);
  const [filters, setFilters] = useState({
    rating: 'all',
    platform: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const applyFilters = () => {
    let results = [...reviews];
    
    if (filters.rating !== 'all') {
      results = results.filter(review => review.rating === filters.rating);
    }
    
    if (filters.platform !== 'all') {
      results = results.filter(review => review.platform === filters.platform);
    }
    
    if (filters.dateFrom) {
      results = results.filter(review => new Date(review.date) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      results = results.filter(review => new Date(review.date) <= new Date(filters.dateTo));
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(review => 
        review.customerName.toLowerCase().includes(searchTerm) || 
        review.comment.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredReviews(results);
  };
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const resetFilters = () => {
    setFilters({
      rating: 'all',
      platform: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
    setFilteredReviews(reviews);
  };
  
  const ratingIcon = (rating: string) => {
    switch (rating) {
      case 'positive':
        return <smile className="h-5 w-5 text-review-positive" />;
      case 'neutral':
        return <meh className="h-5 w-5 text-review-neutral" />;
      case 'negative':
        return <angry className="h-5 w-5 text-review-negative" />;
      default:
        return null;
    }
  };
  
  const platformBadge = (platform: string) => {
    switch (platform) {
      case 'google':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Google</span>;
      case 'tripadvisor':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">TripAdvisor</span>;
      case 'internal':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Interno</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="filter-rating">Avaliação</Label>
            <Select 
              value={filters.rating}
              onValueChange={(value) => handleFilterChange('rating', value)}
            >
              <SelectTrigger id="filter-rating">
                <SelectValue placeholder="Todas as avaliações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="positive">Positivas</SelectItem>
                <SelectItem value="neutral">Neutras</SelectItem>
                <SelectItem value="negative">Negativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="filter-platform">Plataforma</Label>
            <Select 
              value={filters.platform}
              onValueChange={(value) => handleFilterChange('platform', value)}
            >
              <SelectTrigger id="filter-platform">
                <SelectValue placeholder="Todas as plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="filter-date-from">Data de</Label>
            <Input 
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="filter-date-to">Data até</Label>
            <Input 
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="filter-search">Busca</Label>
            <Input 
              id="filter-search"
              type="text"
              placeholder="Buscar por nome ou comentário..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters}>Limpar</Button>
            <Button onClick={applyFilters}>Aplicar Filtros</Button>
          </div>
        </div>
      </Card>
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead className="hidden md:table-cell">Comentário</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma avaliação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(review.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{review.customerName}</TableCell>
                    <TableCell>{ratingIcon(review.rating)}</TableCell>
                    <TableCell>{platformBadge(review.platform)}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {review.comment}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                      {review.platform !== 'internal' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={
                            review.responseStatus === 'responded' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : ''
                          }
                        >
                          {review.responseStatus === 'responded' ? 'Respondido' : 'Responder'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ReviewsList;
