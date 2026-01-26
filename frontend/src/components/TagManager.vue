<template>
  <div class="tag-manager">
    <h2>Tag Management</h2>
    <form @submit.prevent="addTag">
      <input v-model="newTagName" placeholder="New tag name" required />
      <button type="submit">Add Tag</button>
    </form>
    <ul>
      <li v-for="tag in tags" :key="tag._id">
        <input v-model="tag.name" @blur="updateTag(tag)" />
        <button @click="deleteTag(tag._id)">Delete</button>
      </li>
    </ul>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import tagService from '../services/tagService';

export default {
  name: 'TagManager',
  data() {
    return {
      tags: [],
      newTagName: '',
      error: ''
    };
  },
  async created() {
    await this.fetchTags();
  },
  methods: {
    async fetchTags() {
      try {
        this.tags = await tagService.getTags();
      } catch (e) {
        this.error = 'Failed to load tags.';
      }
    },
    async addTag() {
      try {
        const tag = await tagService.createTag({ name: this.newTagName });
        this.tags.push(tag);
        this.newTagName = '';
      } catch (e) {
        this.error = 'Failed to add tag.';
      }
    },
    async updateTag(tag) {
      try {
        await tagService.updateTag(tag._id, { name: tag.name });
      } catch (e) {
        this.error = 'Failed to update tag.';
      }
    },
    async deleteTag(tagId) {
      try {
        await tagService.deleteTag(tagId);
        this.tags = this.tags.filter(t => t._id !== tagId);
      } catch (e) {
        this.error = 'Failed to delete tag.';
      }
    }
  }
};
</script>

<style scoped>
.tag-manager {
  max-width: 400px;
  margin: 0 auto;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>
