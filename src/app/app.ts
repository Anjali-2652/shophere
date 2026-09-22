import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { HeroSection } from './hero-section/hero-section';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, HeroSection],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('ShopEase');
}
